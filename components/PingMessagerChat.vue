<script>
    import {getAvatarUrl, pretty} from '~/assets/utils';
    import getTitle from '~/assets/get-title';
    import Layout from '~/components/LayoutDefault';
    import Modal from '~/components/Modal';
	import {IMaskDirective} from 'vue-imask';
	import {validationMixin} from 'vuelidate';
	import required from 'vuelidate/lib/validators/required';
	import maxLength from 'vuelidate/lib/validators/maxLength';
	import FeeBus from '~/assets/fee';
	import {TX_TYPE_MULTISEND} from 'minterjs-tx/src/tx-types';
	import MultisendTxParams from "minter-js-sdk/src/tx-params/multisend";
	import {postTx} from '~/api/gate';
	
	import {mapGetters, mapState} from 'vuex';
	import {shortHashFilter, fromBase64} from "~/assets/utils";
	import {isMinterAddress, generateMxBySha1, getEcdh, encryptMessage, decryptMessage, pgpPrefix, coinSymbol, isPrivateMessage, prefixLenght, getTimePart} from '~/assets/ping';
	import {getErrorText} from "~/assets/server-error";
	
	let feeBus;
	
    export default {
        components: {
			Modal,
        },
        mixins: [validationMixin],
        directives: {
            imask: IMaskDirective,
        },
        filters: {
            pretty,
			short: shortHashFilter,
        },
        data() {
            return {
				isFormSending: false,
                isModalOpen: false,
                isWaitModalOpen: false,
				form:{
					message: '',
				},
				isChatListLoading: false,
				isChatListLoadingError: false,
                /** @type FeeData */
                fee: {},
				chatArray: [],
				publicList: {},
				pgpKey: '',
				timer: '',
            };
        },
        validations() {
            return {
                form: {
                    message: {
						required,
                        maxLength: maxLength(751),
                    },
                },
            };
        },
        computed: {
			userAddr(){
				if(this.isRouterParamsValid){
					return this.$route.params.id;
				}
			},
			isRouterParamsValid(){
				if(!this.$route.params.id){
					return false;
				}
				if(!isMinterAddress(this.$route.params.id)){
					return false;
				}
				return true;
			},
			textSize(){
				return this.form.message.length;
			},
			encryptedMessage(){
				const encrypted = encryptMessage(this.pgpKey, this.form.message);
				return pgpPrefix+encrypted;
			},
			...mapGetters([
                'address',
				'wallet',
            ]),
			postAddresses(){
				let addresses = [{value: 0, coin: coinSymbol, to: this.$route.params.id}];
				return {addresses: addresses, length: addresses.length};
			},
            feeBusParams() {
                return {
                    txType: TX_TYPE_MULTISEND,
                    txFeeOptions: {payload: this.encryptedMessage, multisendCount: this.postAddresses.length},
                    selectedCoinSymbol: coinSymbol,
                    selectedFeeCoinSymbol: coinSymbol,
                    //baseCoinAmount: this.$store.getters.baseCoin && this.$store.getters.baseCoin.amount,
                };
            },
        },
        watch: {
            feeBusParams: {
                handler(newVal) {
                    if (feeBus && typeof feeBus.$emit === 'function') {
                        feeBus.$emit('updateParams', newVal);
                    }
                },
                deep: true,
            },
        },
        created() {
			this.getPgpKey();			
            feeBus = new FeeBus(this.feeBusParams);
            this.fee = feeBus.fee;
            feeBus.$on('updateFee', (newVal) => {
                this.fee = newVal;
            });
        },
		update(){
		},
		beforeDestroy() {
			clearInterval(this.timer)
		},
        methods: {
			getPgpKey(){
				this.isChatListLoading = true;
				this.isChatListLoadingError = false;
				this.$store.dispatch('FETCH_PING_PGP_LIST')
					.then((txList) => {
						let publicKey = txList[this.userAddr];
						if(!publicKey){
							return [];
						}
						publicKey = Buffer.from(publicKey, 'Base64');
						let pgpKey = getEcdh(this.wallet._privKey, publicKey);
						if(pgpKey != null){
							this.pgpKey = pgpKey;
							//console.log(12312321321, pgpKey);
							this.updateChatArray();
							this.timer = setInterval(this.updateChatArray, 5000)
						}
					});
			},
			updateChatArray(){
				this.$store.dispatch('FETCH_CHAT', {page: 1, address: this.userAddr})
					.then((txInfo)=>{
						let temp = [];
						for(const el of txInfo.data){
							if(isPrivateMessage(el) && (el.from == this.address || el.from == this.userAddr)){
								const message = decryptMessage(this.pgpKey, fromBase64(el.payload).slice(prefixLenght));
								if(el.from == this.address && message){
									temp.push({type: 2, text: message, timeParts: getTimePart(el.timestamp)});
								}
								else if (el.from == this.userAddr && message){
									temp.push({ type: 1, text: message, timeParts: getTimePart(el.timestamp)});
								}
							}
						}
						
						this.chatArray = temp;
					})
						
					
					/*
					.catch((error) => {
						this.isChatListLoading = false;
						this.isChatListLoadingError = true;
					})
					*/
					
			},
            openTxModal() {
                if (this.isFormSending) {
                    return;
                }
                if (this.$v.$invalid) {
                    this.$v.$touch();
                    return;
                }
                this.isModalOpen = true;
            },
            sendTx() {
                if (this.isFormSending) {
                    return;
                }
                this.isFormSending = true;
                this.isModalOpen = false;
                this.isWaitModalOpen = true;
                this.serverError = '';
                this.$store.dispatch('FETCH_ADDRESS_ENCRYPTED')
                    .then(() => {
                        let txParams;
						txParams = new MultisendTxParams({
							privateKey: this.$store.getters.privateKey,
							list: this.postAddresses.addresses,
							message: this.encryptedMessage,
							feeCoinSymbol: coinSymbol,
						});
                        postTx(txParams).then((txHash) => {
                            this.isFormSending = false;
                            this.isWaitModalOpen = false;
                            this.clearForm();
                        }).catch((error) => {
                            console.log(error);
                            this.isFormSending = false;
                            this.isWaitModalOpen = false;
                            this.serverError = getErrorText(error);
                        });
                    })
                    .catch((error) => {
                        this.isFormSending = false;
                        this.isWaitModalOpen = false;
                        this.serverError = getErrorText(error);
                    });
				
            },
            clearForm() {
                this.form.message = '';
                this.$v.$reset();
            },

        },
    };
</script>
<template>
	<div>
		<div v-if="isRouterParamsValid">
			<style>
				.chat__body {
					display: flex;
					width: 100%;
					height: 100%;
					background-image: url("/img/ping-chat-bg2.jpg");
					background-position-y: -54px;
					background-attachment: fixed;
					padding-top: 20px;
					padding-bottom: 20px;
				}
				.messages {
					display: flex;
					flex-direction: column;
					flex-grow: 1;
					justify-content: flex-end;
					margin-left: 16px;
					margin-right: 16px;
					margin-bottom: 6px;
				}
				.message {
					align-self: flex-start;
					display: flex;
					align-items: center;
					position: relative;
					min-height: 30px;
					max-width: 80%;
					background-color: #fff;
					margin-bottom: 8px;
					border-radius: 6px;
					z-index: 2;
					box-shadow: 0 2px 1px 0 rgba(160,172,182,.5);
					
				}
				.message.my-message {
					align-self: flex-end;
					background-color: #effdde;
					box-shadow: 0 2px 1px 0 rgba(93,196,82,.5);
				}
				
				
				.message__text,.message__image__text .message__text__content {
					padding-top: 10px;
					padding-left: 10px;
					padding-right: 10px;
					z-index: 2;
				}
				.message__time {
					display: inline-block;
					float: right;
					padding-top: 4px;
					padding-bottom: 4px;
					padding-left: 14px;
					text-align: right;
					font-size: 12px;
					color: #a0acb6;
				}
				.my-message .message__time {
					color: #5dc452;
				}
				
				.message.droplet:before {
					position: absolute;
					content: '';
					bottom: 0;
					left: -8px;
					width: 12px;
					height: 1px;
					background-color: inherit;
					z-index: 1;
					box-shadow: 0px 1px 1px 1px rgba(160,172,182,.5);
				}
				.message.droplet:after {
					position: absolute;
					content: '';
					bottom: 0;
					left: -10px;
					width: 16px;
					height: 10px;
					clip-path: url(#left-droplet);
					background-color: inherit;
					z-index: 1;
					box-shadow: 0 2px 1px 0 rgba(160,172,182,.5);
				}

				.message.my-message.droplet:before {
					right: -8px;
					left: initial;
					box-shadow: 0px 1px 1px 1px rgba(93,196,82,.5);
				}
				.message.my-message.droplet:after {
					right: -10px;
					left: initial;
					clip-path: url(#right-droplet);
				}
				pre{
					margin: 0 10px 0 0;
				}
			</style>

			<form class="u-section u-container" @submit.prevent="openTxModal">
				<div style="display: flex; flex-direction: row; align-items: center;">
					<label class="bip-field bip-field--row" :class="{'is-error': $v.form.message.$error}" style="display: flex; flex-direction: column; align-items: center;">
						<input class="bip-field__input " type="text"
							   v-model.trim="form.message"
							   @blur="$v.form.message.$touch();"
							   placeholder="Message"
							   style="margin-top:0px; border-top-right-radius: 0; border-bottom-right-radius: 0;"
						></input>
					</label>
					<button 
						class="bip-button bip-button--main" 
						style="display: flex; flex-direction: column; width: 46px;height: 46px; align-items: center; border-top-left-radius: 0; border-bottom-left-radius: 0;"
						:class="{'is-loading': isFormSending, 'is-disabled': $v.$invalid || isFormSending}"
					>
						>
					</button>
				</div>
				<span class="bip-field__label">{{textSize}} of 751 symbols</span>
				<div class="bip-field__label">
					<span class="form-field__error" v-if="$v.form.message.$dirty && !$v.form.message.maxLength">Max 751 symbols</span>
					<span class="form-field__error" v-if="$v.form.message.$dirty && !$v.form.message.required">Enter message</span>
				</div>
				<div style="display: flex; flex-direction: row; align-items: center;">
					<div style="display: flex; flex-direction: column; align-items: center;">
						<span class="list-item__name u-text-nowrap">Transaction Fee</span>
					</div>
					<div style="flex: auto; display: flex; flex-direction: column; align-items: center;" class="u-text-right" >
						<div class="list-item__label list-item__label--strong">
							{{ fee.coinSymbol }} {{ fee.value | pretty }}
							<span class="u-display-ib" v-if="!fee.isBaseCoin">({{ $store.getters.COIN_NAME }} {{ fee.baseCoinValue | pretty }})</span>
						</div>
					</div>
				</div>
				
			</form>
					
			<div class="chat__body">
				<div class="messages">
					<div class="message" v-bind:class="{'my-message': message.type == 2}" v-for="message in chatArray">
						<div class="message__text">
							<div class="message__text__content">{{message.text}}</div>
						</div>
						<div class="message__time"><pre>{{message.timeParts.time}}</pre><pre>{{message.timeParts.date}}</pre></div>
					</div>
				</div>
			</div>
			
			<!-- confirm send modal -->
			<Modal :isOpen.sync="isModalOpen" :hideCloseButton="true">
				<div class="modal__panel">
					<h3 class="modal__title u-h2">You're pinging</h3>
					<div class="modal__content">
						<p class = "">
							{{form.message}}
						</p>
						<div class="u-section">
							<span>Transaction Fee</span>

							<p class="send__modal-value">

								<span class="send__modal-amount">{{ fee.coinSymbol }} {{ fee.value | pretty }}</span>
							</p>
						</div>
					</div>
					<div class="modal__footer">
						<button class="bip-button bip-button--main" @click="sendTx">Ping message</button>
						<button class="bip-button bip-button--ghost-main" @click="isModalOpen = false">Cancel</button>
					</div>
				</div>
			</Modal>
			<!-- wait modal -->
			<Modal :isOpen.sync="isWaitModalOpen" :hideCloseButton="true">
				<div class="modal__panel">
					<h3 class="modal__title u-h2">Please wait</h3>
					<div class="modal__content">
						<svg class="loader loader--inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
							<circle class="loader__path" cx="25" cy="25" r="16"></circle>
						</svg>
						<span class="u-text-middle">Sending ping...</span>
					</div>
				</div>
			</Modal>
			
		</div>
		<div v-else>
			<div class="u-section u-container">
				<div class="list-title list-title--bold">404</div>
			</div>
		</div>
	</div>
</template>
