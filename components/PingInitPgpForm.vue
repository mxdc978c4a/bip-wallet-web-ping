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
	import {generateMxBySha1, coinSymbol, pgpKeyAdress, pgpKeyPrefix} from '~/assets/ping';
	import {privateToPublic} from 'ethereumjs-util';
	import {shortHashFilter} from "~/assets/utils";
	
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
			short: shortHashFilter,
        },
        data() {
            return {
                isFormSending: false,
                serverError: '',
                form: {
                    message: '',
                },
                /** @type FeeData */
                fee: {},
                isModalOpen: false,
                isWaitModalOpen: false,
				isRegistered: false,
            };
        },
        validations() {
            return {
                form: {
                    message: {
						required,
                        maxLength: maxLength(1024),
                    },
                },
            };
        },
        computed: {
			postAddresses(){
				let list = [{value: 0, coin: coinSymbol, to: pgpKeyAdress}];
				return {addresses: list, length: list.length};
			},
			messageToSend(){
				return this.form.message;
			},
			...mapGetters([
				'address',
                'wallet',
            ]),
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
			publicKey(){
				return this.wallet._pubKey.toString('base64');
			},
        },
		beforeMount() {
			this.checkIsRegister();
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
			this.form.message = pgpKeyPrefix+this.publicKey;
			
            feeBus = new FeeBus(this.feeBusParams);
            this.fee = feeBus.fee;
            feeBus.$on('updateFee', (newVal) => {
                this.fee = newVal;
            });
			
        },
        methods: {
			checkIsRegister(){
				this.isFormSending = true;
				this.isRegistered = false;
				if(this.$store.state.pingIsPgpRegistered){
					this.isFormSending = false;
					this.isRegistered = true;
					return;
				}
				if(this.publicKey == this.$store.state.pingPgpList[this.address]){
					this.isFormSending = false;
					this.isRegistered = true;
					this.$store.dispatch('FETCH_PING_PGP_REGISTER');
					return;
				}
				this.$store.dispatch('FETCH_PING_PGP_LIST')
					.then((txList) => {
						if(txList && this.publicKey == txList[this.$store.getters.address]){
							this.isFormSending = false;
							this.isRegistered = true;
							this.$store.dispatch('FETCH_PING_PGP_REGISTER');
						}else{
							this.isFormSending = false;
							this.isRegistered = false;
						}
					})
					.catch((error) => {
						console.log(error);
						this.isFormSending = false;
						this.isRegistered = false;
					});
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
                            this.clearForm();
							this.$store.dispatch('FETCH_PING_PGP_REGISTER');
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
		<form novalidate @submit.prevent="openTxModal">
            <div class="u-section u-container">
				<span class="bip-field__label">Register PGP public key</span>
                <button class="bip-button bip-button--main" :class="{'is-loading': isFormSending, 'is-disabled': $v.$invalid, 'is-disabled': isRegistered}">
                    <span class="bip-button__content" v-if="!isRegistered">
						<p>
							Register PGP
						</p>
						<p class="list-item__label list-item__label--strong">
								{{ fee.coinSymbol }} {{ fee.value | pretty }}
								<span class="u-display-ib" v-if="!fee.isBaseCoin">({{ $store.getters.COIN_NAME }} {{ fee.baseCoinValue | pretty }})</span>
						</p>
					</span>
					<span class="bip-button__content" v-else>
						<p>
							Your PGP key is already registered!
						</p>
					</span>
                    <svg class="loader loader--button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                        <circle class="loader__path" cx="25" cy="25" r="16"></circle>
                    </svg>
                </button>
                <span class="bip-form__error" v-if="serverError">{{ serverError }}</span>
            </div>
        </form>

        <!-- confirm send modal -->
        <Modal :isOpen.sync="isModalOpen" :hideCloseButton="true">
            <div class="modal__panel">
                <h3 class="modal__title u-h2">You're registering PGP public key</h3>
                <div class="modal__content">
					<div class="u-section">
						<span>Transaction Fee</span>

						<p class="send__modal-value">

							<span class="send__modal-amount">{{ fee.coinSymbol }} {{ fee.value | pretty }}</span>
						</p>
					</div>
                </div>
                <div class="modal__footer">
                    <button class="bip-button bip-button--main" @click="sendTx">Register PGP PUBLIC KEY</button>
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
</template>
