<script>
    import * as TX_TYPES from 'minterjs-tx/src/tx-types';
	
    import {getAvatarUrl, shortHashFilter, fromBase64} from "~/assets/utils";
	import {getMinterscanIconUrl, timeAgo, isComment, isPost, decodeMx, generateCommentMx, coinSymbol, isMinterAddress} from '~/assets/ping';

	import PingTableCommentForm from '~/components/PingTableCommentForm';
	import PingTableMessage from '~/components/PingTableMessage';
	import PingTableLike from '~/components/PingTableLike';
	import PingIcon from '~/components/PingIcon';
	import {mapState} from 'vuex';
	
	function uniq(a) {
		var seen = {};
		return a.filter(function(item) {
			return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		});
	}
	
    export default {
		components: {
			PingTableCommentForm,
			PingTableMessage,
			PingIcon,
			PingTableLike,
        },
        filters: {
			timeAgo: timeAgo,
            short: shortHashFilter,
        },
        props: {
            /** @type Array<Transaction>*/
			txProp:{
				type: Object,
				required: true,
			},
        },
        data() {
            return {
                activeTx: null,
				transactionList: [],
				likeList: [],
				isLoading: false,
				isError: false,
            };
        },
        computed: {
            ...mapState({
                pingTransactionList: 'pingTransactionList',
				pingLikeList: 'pingLikeList',
				minterscanProfilesList: 'minterscanProfilesList',
            }),
		},
		created(){
			this.updateTransactionList();
		},
		watch:{
			"txProp": function(){
				this.updateTransactionList();
			},
			"$route.params.id": function(){
				this.updateTransactionList();
			},
		},
        methods: {
			sortTransactionList(){
				let counts = {};
				for(const el in this.likeList){
					const x = this.likeList[el];
					counts[x] = (counts[x] || 0)+1;
				}
				console.log(counts);
				let tetera = [];
				for(const el of this.transactionList){
					const addr = generateCommentMx(el.block,el.txn);
					if(counts[addr]){
						tetera.push([el, counts[addr]]);
					}else{
						tetera.push([el, 0]);
					}
				}
				tetera.sort((a,b) => {
					return b[1] - a[1]
				})
				let newArr = [];
				tetera.map((el) => {
					el[0].likes = el[1]
					newArr.push(el[0]);
				})
				this.transactionList = newArr;
				
			},
			updateLikeList(){
				if(this.likeList){
					this.likeList = this.pingLikeList;
					this.sortTransactionList();
					return;
				}else{
					
					this.$store.dispatch('FETCH_PING_LIKE_LIST')
							.then((likeTxInfo) => {
								this.likeList = likeTxInfo;
								this.sortTransactionList();
								return;
							})
				}
			},
			updateTransactionList(){
				this.transactionList = [this.txProp];
				this.updateLikeList();
				return;
			},
			isPost,
			isComment,
			isPingTx(tx){
				//check is MultiSend
				if(tx.type != Number(TX_TYPES.TX_TYPE_MULTISEND)){
					return false;
				}
				// check is PING coin
				if(!tx.data.list.every((el)=>{return el.coin == coinSymbol})){
					return false;
				}
				// check is have prefix
				if(!(isPost(tx) || isComment(tx) )){
					return false;
				}
				
				return true;
			},
			getMinterscanIconUrl,
            getAvatarUrl,
            getName(address) {
                if (this.$store.state.userList[address] && this.$store.state.userList[address].username) {
                    return '@' + this.$store.state.userList[address].username;
                } else {
                    return shortHashFilter(address);
                }
            },
			getReplyingLink(tx){
				let decode = decodeMx(tx.data.list[0].to);
				if(decode == null){
					return null
				}
				decode.a = decode.a.toString()
				decode.b = decode.b.toString()
				return '/ping/'+decode.a+'-'+decode.b
			},
            txClick(hash) {
                if (this.activeTx !== hash) {
                    // open clicked tx
                    this.activeTx = hash;
                } else {
                    // close already opened clicked tx
                    this.activeTx = null;
                }
            },
			onProfileClick(tx){
				this.$router.push('/ping/profile/'+tx.from)
			},
			onRepingClick(tx){
				this.$emit('pingMessage', {tx: tx});
			},
			
			onMessageClick(tx){
				this.$router.push('/ping/'+tx.block+'-'+tx.txn);
				//console.log(tx);
			},
			getReplyingTo(tx){
				let decode = decodeMx(tx.data.list[0].to);
				if(decode == null){
					return null
				}
				decode.a = decode.a.toString()
				decode.b = decode.b.toString()
				
				return decode.a+'-'+decode.b;
			},
        },
    };
</script>

<template>
	<div>
		<style>
			.ping-list .replying{
				#font-weight: bold;
				font-style: italic;
			}
			.ping-list .pingHashtagLink{
				color: #1B95E0;
				text-decoration: none;
			}
			.ping-list .pingHashtagLink:hover {
				border-bottom: 1px solid #1B95E0;
				#color: #000;
				text-decoration: none;
			}
			.ping-list.list-item-wrap{
				cursor: pointer;
			}
			.ping-list.list-item-wrap:hover{
				background: #F5F8FA;
			}
			.ping-list .list-item:hover{
				background: #EDF0F2;
			}
			.ping-list .ping__post__button{
				color: gray;
			}
			.ping-list .ping__post__button:hover{
				color: black;
			}
			.fontSizeMedium{
				font-size: medium;
			}
		</style>
		
		<style type="text/css">
			.profile__info{display:block; float:left;}
			.list-item {background-position: top;}
		</style>
		
		
		<div class="list" v-if="transactionList && transactionList.length">
			<div class="ping-list list-item-wrap" v-for="tx in transactionList" v-if="isPingTx(tx)" @click="onMessageClick(tx)">
				<div class="list-item list-item--tappable" @click.stop="onProfileClick(tx)" >
					<div class="list-item__left">
						<img class="list-item__thumbnail" :src="minterscanProfilesList[tx.from]?getMinterscanIconUrl(tx.from):getAvatarUrl(tx.from)" alt="" role="presentation">
					</div>
					<div class='list-item__center' :class="{'list-item__overflow': true}">
						<div class='profile__info'>
							<div class='profile__info__name'>
								<span>{{(minterscanProfilesList[tx.from])?minterscanProfilesList[tx.from].title : getName(tx.from)}}</span>
								<PingIcon :isConfirmed="minterscanProfilesList[tx.from] && minterscanProfilesList[tx.from].isVerified"/>
							</div>
						</div>
					</div>
					<div class="list-item__right">
						<div class="list-item__amount">
							<div class="tx-info__value"  style="font-size: 0.75em;">{{ tx.timestamp | timeAgo}}</div>
						</div>
					</div>
				</div>
				<div class="u-section">
					<div class="u-container replying list-item__right" v-if="isComment(tx)" @click.stop=''>
						Replying to <nuxt-link class="pingHashtagLink" :to="getReplyingLink(tx)" >@{{getReplyingTo(tx)}}</nuxt-link>
					</div>
					<div class="u-container">
						<div>
							<div class="u-grid u-grid--vertical-margin">
								<div class="u-cell fontSizeMedium">
									<PingTableMessage :txProp="tx" />
								</div>
							</div>
							<div class="list-item" style="font-size:1.2em; font-weight: bold; color: gray; background: none;">
								<div class="list-item__left ping__post__button"  :class="{'list-item__overflow': true}" @click.stop="txClick(tx.hash)">
									COMMENT
								</div>
								<div class="list-item__right ping__post__button" :class="{'list-item__overflow': true}" @click.stop="">
									{{tx.likes}}
									<PingTableLike :txProp="tx" @click.stop=""/>
								</div>
							</div>
						</div>
						
						<div class="u-grid--vertical-margin" v-if="activeTx === tx.hash" @click.stop=''>
							<PingTableCommentForm :txProp="tx"/>
						</div>
					</div>
				</div>
			</div>
		</div>

		
	</div>
</template>
