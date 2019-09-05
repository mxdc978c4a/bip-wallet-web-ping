<script>
    import {getAvatarUrl, pretty} from '~/assets/utils';
    import getTitle from '~/assets/get-title';
    import Layout from '~/components/LayoutDefault';
    import Modal from '~/components/Modal';
	
	import {mapGetters, mapState} from 'vuex';
	import {shortHashFilter} from "~/assets/utils";
	import {isMinterAddress, generateMxBySha1, isPrivateMessage, getMinterscanIconUrl} from '~/assets/ping';
	
	import PingIcon from '~/components/PingIcon';
	
    export default {
        components: {
			PingIcon,
        },
        filters: {
            pretty,
			short: shortHashFilter,
        },
		props: {
		
		},
        data() {
            return {
				searchText: '',
				publicList: {},
				chatList: [],
				isPublicListLoading: false,
				isPublicListLoadingError: false,
				isChatListLoading: false,
				isChatListLoadingError: false,
            };
        },
        validations() {
        },
        computed: {
            ...mapState({
                balance: 'balance',
                delegation: 'delegation',
				pingChatList: 'pingChatList',
				minterscanProfilesList: 'minterscanProfilesList',
            }),
			...mapGetters([
                'username',
                'address',
                'baseCoin',
            ]),
			profilesList(){
				if(this.publicList[this.searchText]){
					return [this.searchText];
				}
				else if(this.chatList){
					let temp = this.chatList.filter((el) => {
						return this.publicList[el];
					});
					return temp;
				}
				return [];
			},
        },
		created(){
			this.getPublicList();
			this.updateChatList()
		},
		watch:{
			
		},
        methods: {
			updateChatList(){
				this.isChatListLoading = true;
				if(this.pingChatList){
					this.chatList = Object.keys(this.pingChatList);
					this.isChatListLoading = true;
					this.isChatListLoadingError = false;
				}
				this.$store.dispatch('FETCH_PING_CHAT_LIST')
					.then((txList)=>{
						this.chatList = Object.keys(txList)
						this.isChatListLoading = true;
						this.isChatListLoadingError = false;
					});
			},
			getPublicList(){
				if(this.isPublicListLoading){
					return;
				}
				this.isPublicListLoading = true;
				this.$store.dispatch('FETCH_PING_PGP_LIST')
					.then((txList) => {
						this.publicList = txList;
						this.isPublicListLoading = true;
						this.isPublicListLoadingError = false;
					})
					.catch((error) => {
						console.log(error);
						this.isPublicListLoading = false;
						this.isPublicListLoadingError = true;
					});
			},
			getAvatarUrl,
			getMinterscanIconUrl,
			openChat(addr){
				this.$router.push("/ping/messager/"+addr);
			},
			openProfile(addr){
				this.$router.push("/ping/profile/"+addr);
			}
        },
    };
</script>
<template>
	<div>
		<style>
			.ping-list.list-item{
				cursor: pointer;
			}
			.ping-list.list-item:hover{
				background: #F5F8FA;
			}
			.ping-list.list-item__left{
				padding-left: 10px;
				border-radius: 34px;
			}
			.ping-list.list-item__left:hover{
				background: #EDF0F2;
			}
		</style>
		<div class="u-section u-container">
				<label class="bip-field bip-field--row">
					<input class="bip-field__input " type="text"
						   v-model.trim="searchText"
						   placeholder="Looking for a friend?"
					></input>
				</label>
		</div>
		<div class="list" v-if="isChatListLoading">
			<div class="ping-list list-item" v-for="userAddr in profilesList" @click="openChat(userAddr)">
				<div class="ping-list list-item__left" @click.stop="openProfile">
					<img class="list-item__thumbnail" :src="minterscanProfilesList[userAddr]?getMinterscanIconUrl(userAddr):getAvatarUrl(userAddr)" alt="" role="presentation">
				</div>
				<div class="list-item__center">
					<div class="balance__caption">{{(minterscanProfilesList[userAddr] && minterscanProfilesList[userAddr].title)?minterscanProfilesList[userAddr].title: userAddr | short}} <span style="fill: white;"><PingIcon/></span></div>
				</div>
				<div class="list-item__right">
					<div class="balance__caption">2 days</div>
				</div>
			</div>
		</div>
	</div>
</template>
