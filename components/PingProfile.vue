<script>
    import {getAvatarUrl, pretty} from '~/assets/utils';
    import getTitle from '~/assets/get-title';
    import Layout from '~/components/LayoutDefault';
    import Modal from '~/components/Modal';
	
	import {mapGetters, mapState} from 'vuex';
	import {shortHashFilter} from "~/assets/utils";
	import {coinSymbol, getMinterscanIconUrl} from '~/assets/ping';
	import PingIcon from '~/components/PingIcon';
	

	
    export default {
        components: {
			PingIcon,
			Modal,
        },
        filters: {
            pretty,
			short: shortHashFilter,
        },
		props: {
			profileAddr:{
				type: String,
				required: true,
			}
		},
        data() {
            return {
				balanceParts: {},
				isModalOpen: false,
            };
        },
        validations() {
        },
        computed: {
            ...mapState({
                balance: 'balance',
				pingProfiles: 'pingProfiles',
				minterscanProfilesList: 'minterscanProfilesList',
            }),
			...mapGetters([
                'address',
            ]),
			shortName(){
				return shortHashFilter(this.profileAddr);
			},
			isMyProfile(){
				if(this.profileAddr === this.address){
					return true;
				}
				return false;
			},
        },
		created(){
			this.getBalance();
		},
		watch: {
			"profileAddr": function(){
				this.getBalance()
			},
		},
        methods: {
			getMinterscanIconUrl,
			getBalance(){
				let coinList;
				if(this.isMyProfile){
					this.balanceParts = this.getBalanceParts(this.balance);
					return;
				}
				if(this.pingProfiles[this.profileAddr]){
					this.balanceParts = this.getBalanceParts(this.pingProfiles[this.profileAddr].balances)
					return;
				}
				return this.$store.dispatch('FETCH_PING_PROFILE', [this.profileAddr])
					.then((balance)=>{
						this.balanceParts = this.getBalanceParts(balance)
						return;
					});
			},
			getBalanceParts(coinList){
				const feeCoinName = 'PING';
				
				let feeCoin = coinList.find(function(element, index, array){
					if(element.coin == feeCoinName){
						return true;
					}
				});
				
				const parts = feeCoin ? pretty(feeCoin.amount).split('.') : [];
				
                return {
                    whole:  parts[0] ? parts[0] : 0,
                    decimal: parts[1] ? '.' + parts[1] : '',
					baseCoinSpell: feeCoinName,
                };
			},
			getAvatarUrl,
			clickOpenSetting(event){
				this.$router.push('/ping/setting');
			},
			onNameClick(){
				this.isModalOpen = true;
			},
        },
    };
</script>
<template>
	<div class="balance u-container">
		<style>
			.pinglink{
				color: white;
			}
			.onNameClick{
				color: white;
				cursor: pointer;
				text-decoration: underline;
			}
			.pingProfile .balance__caption{
				padding: 2px 0 2px 0;
			}
		</style>
		<div class="list-item balance">
			<div class="list-item__left">
				<img class="list-item__thumbnail" :src="minterscanProfilesList[profileAddr]&&minterscanProfilesList[profileAddr].icon?getMinterscanIconUrl(profileAddr):getAvatarUrl(profileAddr)" alt="" role="presentation">
			</div>
			<div class="pingProfile list-item__center">
				<div class="onNameClick balance__caption" @click="onNameClick()">
					{{ (minterscanProfilesList[profileAddr])?minterscanProfilesList[profileAddr].title : shortName }} 
					<span style="fill: white;">
						<PingIcon :isConfirmed="minterscanProfilesList[profileAddr] && minterscanProfilesList[profileAddr].isVerified"/>
					</span>
				</div>
				<div class="balance__caption" v-if="minterscanProfilesList[profileAddr] && minterscanProfilesList[profileAddr].www">
					<a class="pinglink" v-bind:href="'//'+minterscanProfilesList[profileAddr].www" target="_blank">{{minterscanProfilesList[profileAddr].www}}</a>
				</div>
				<div class="balance__caption" v-if="minterscanProfilesList[profileAddr] && minterscanProfilesList[profileAddr].description">
					{{minterscanProfilesList[profileAddr].description}}
				</div>
			</div>
			<div class="list-item__right">
				<div class="balance__caption" v-if="isMyProfile">
					<nuxt-link class="pinglink" to="/ping/setting"> SETTING </nuxt-link>
				</div>
			</div>
		</div>
		<div class="balance__value" v-if="balanceParts">
			<span class="balance__whole">{{ balanceParts.whole }}</span>
			<span class="balance__decimal">{{ balanceParts.decimal }} {{ balanceParts.baseCoinSpell }}</span>
		</div>
	       
		<!-- profile address modal -->
        <Modal :isOpen.sync="isModalOpen" :hideCloseButton="true">
			<div class="modal__panel">
				<div class="list-item balance">
					<div class="list-item__left">
						<img class="list-item__thumbnail" :src="minterscanProfilesList[profileAddr]&&minterscanProfilesList[profileAddr].icon?getMinterscanIconUrl(profileAddr):getAvatarUrl(profileAddr)" alt="" role="presentation">
					</div>
					<div class="list-item__center">
						<div class="balance__caption" @click="onNameClick()">
							{{ (minterscanProfilesList[profileAddr])?minterscanProfilesList[profileAddr].title : shortName }} 
							<span style="fill: white;">
								<PingIcon :isConfirmed="minterscanProfilesList[profileAddr] && minterscanProfilesList[profileAddr].isVerified"/>
							</span>
						</div>
						<div class="balance__caption" v-if="minterscanProfilesList[profileAddr] && minterscanProfilesList[profileAddr].www">
							<a class="pinglink" v-bind:href="'//'+minterscanProfilesList[profileAddr].www" target="_blank">{{minterscanProfilesList[profileAddr].www}}</a>
						</div>
						<div class="balance__caption" v-if="minterscanProfilesList[profileAddr] && minterscanProfilesList[profileAddr].description">{{minterscanProfilesList[profileAddr].description}}</div>
					</div>
					<div class="list-item__right">
						<div class="balance__caption" v-if="isMyProfile">
							<nuxt-link class="pinglink" to="/ping/setting"> SETTING </nuxt-link>
						</div>
					</div>
				</div>
				
                <div class="modal__content">
					<div class="u-section" style="color: black">
						Address: {{profileAddr}}
					</div>
                </div>
                <div class="modal__footer">
                    <button class="bip-button bip-button--ghost-main" @click="isModalOpen = false">Close</button>
                </div>
            </div>
        </Modal>
	</div>
</template>