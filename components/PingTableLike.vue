<script>
	import axios from 'axios';
	import Big from 'big.js';
	import {IMaskDirective} from 'vue-imask';
	import {validationMixin} from 'vuelidate';
	import required from 'vuelidate/lib/validators/required';
	import maxValue from 'vuelidate/lib/validators/maxValue';
	import maxLength from 'vuelidate/lib/validators/maxLength';
	import minLength from 'vuelidate/lib/validators/minLength';
	import withParams from 'vuelidate/lib/withParams';
	import SendTxParams from "minter-js-sdk/src/tx-params/send";
	import MultisendTxParams from "minter-js-sdk/src/tx-params/multisend";
	import DelegateTxParams from "minter-js-sdk/src/tx-params/stake-delegate";
	import {TX_TYPE_SEND, TX_TYPE_DELEGATE, TX_TYPE_MULTISEND} from 'minterjs-tx/src/tx-types';
	import {getAddressInfoByContact} from "~/api";
	import {postTx} from '~/api/gate';
	import FeeBus from '~/assets/fee';
	import {getServerValidator, fillServerErrors, getErrorText, getErrorCode} from "~/assets/server-error";
	import {getAvatarUrl, pretty, fromBase64} from '~/assets/utils';
	import getTitle from '~/assets/get-title';
	import Layout from '~/components/LayoutDefault';
	import Modal from '~/components/Modal';

	import {mapGetters, mapState} from 'vuex';
	import {generateMxBySha1, generateCommentMx, coinSymbol, likePrefix, likeAddress, isPost} from '~/assets/ping';

	
	let feeBus;

	
    export default {
        PAGE_TITLE: 'TWITTER',
        components: {
            Layout,
            Modal,
        },
        mixins: [validationMixin],
        directives: {
            imask: IMaskDirective,
        },
        filters: {
            pretty,
        },
		props: {
			txProp:{
				type: Object,
				required: true,
			},
		},
        data() {
            return {
				messageToSend: '',
                isFormSending: false,
                serverError: '',
                /** @type FeeData */
                fee: {},
                isModalOpen: false,
                isWaitModalOpen: false,
            };
        },
        computed: {
			postAddresses(){
				//console.log(123,this.txProp);
				let address = [
					{value: 0, coin: coinSymbol, to: likeAddress},
					{value: 0, coin: coinSymbol, to: generateCommentMx(this.txProp.block, this.txProp.txn)},
				];
				/*
				if(isPost(this.txProp)){
					address.push({value: 0, coin: coinSymbol, to: this.txProp.data.list[0].to});
				}
				*/

				//console.log(address);
				//fromBase64(this.txProp.payload)
				//console.log(fromBase64(this.txProp.payload));
				
				return {addresses: address, length: address.length};
			},
			/*
            ...mapState({
                balance: 'balance',
                delegation: 'delegation',
            }),
			*/
            feeBusParams() {
                return {
                    txType: TX_TYPE_MULTISEND,
                    txFeeOptions: {payload: this.messageToSend, multisendCount: this.postAddresses.length},
                    selectedCoinSymbol: coinSymbol,
                    selectedFeeCoinSymbol: coinSymbol,
                    baseCoinAmount: this.$store.getters.baseCoin && this.$store.getters.baseCoin.amount,
                };
            },
			
        },
		beforeMount() {
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
			this.updateMessageToSend();
            feeBus = new FeeBus(this.feeBusParams);
            this.fee = feeBus.fee;
            feeBus.$on('updateFee', (newVal) => {
                this.fee = newVal;
            });
        },
        methods: {
			updateMessageToSend(){
				this.messageToSend = likePrefix;
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
							message: this.messageToSend,
							feeCoinSymbol: coinSymbol,
						});
                        postTx(txParams).then((txHash) => {
                            this.isFormSending = false;
                            this.isWaitModalOpen = false;
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
			likeClick(){
				this.isModalOpen = true;
			},
        },
    };
</script>

<template>
    <div>
		<div @click="likeClick()">
			❤
		</div>
        <!-- confirm send modal -->
		<div>
			<Modal :isOpen.sync="isModalOpen" :hideCloseButton="true">
				<div class="modal__panel">
					<h3 class="modal__title u-h2">You're pinging</h3>
					<div class="modal__content">
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
    </div>
</template>
