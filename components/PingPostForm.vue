<script>
	//import axios from 'axios';
	//import Big from 'big.js';
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
	import {getAvatarUrl, pretty} from '~/assets/utils';
	import getTitle from '~/assets/get-title';
	import Layout from '~/components/LayoutDefault';
	import Modal from '~/components/Modal';

	import {mapGetters, mapState} from 'vuex';
	import {generateHashtagMx, coinSymbol, postPrefix, mainAddress} from '~/assets/ping';

	
	let feeBus;

	
    export default {
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
            };
        },
        validations() {
            return {
                form: {
                    message: {
						required,
                        maxLength: maxLength(1019),
                    },
                },
            };
        },
        computed: {
			postAddresses(){
				let hashtags = this.form.message.match(/\B\#[\wА-Яа-я][\wА-Яа-я]+/g);
				if(hashtags == null){
					hashtags = ['']
				}
				else{
					hashtags = hashtags.filter(function(elem, pos){
						return hashtags.indexOf(elem)==pos;
					});
				};
				hashtags = hashtags.map(function(elem){
					return {value: 0, coin: coinSymbol, to: generateHashtagMx(elem)};
				});
				
				hashtags.unshift({value: 0, coin: coinSymbol, to: mainAddress});
				return {addresses: hashtags, length: hashtags.length};
			},
			messageToSend(){
				return postPrefix+this.form.message;
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
            feeBus = new FeeBus(this.feeBusParams);
            this.fee = feeBus.fee;
            feeBus.$on('updateFee', (newVal) => {
                this.fee = newVal;
            });
        },
        methods: {
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
							setTimeout(()=>{this.$store.dispatch('FETCH_PING_UPDATE_TABLE')}, 5000);
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
                <label class="bip-field bip-field--row" :class="{'is-error': $v.form.message.$error}">
                    <textarea class="bip-field__input " type="text"
                           v-model.trim="form.message"
                           @blur="$v.form.message.$touch();"
						   placeholder="What’s happening?"
						   :style="{height: '150px'}"
                    ></textarea>
                    <span class="form-field__error" v-if="$v.form.message.$dirty && !$v.form.message.maxLength">Max 1019 symbols</span>
					<span class="form-field__error" v-if="$v.form.message.$dirty && !$v.form.message.required">Enter message</span>
                </label>
            </div>
            <div class="list">
                <a class="list-item">
                    <div class="list-item__center">
                        <span class="list-item__name u-text-nowrap">Transaction Fee</span>
                    </div>
                    <div class="list-item__right u-text-right">
                        <div class="list-item__label list-item__label--strong">
                            {{ fee.coinSymbol }} {{ fee.value | pretty }}
                            <span class="u-display-ib" v-if="!fee.isBaseCoin">({{ $store.getters.COIN_NAME }} {{ fee.baseCoinValue | pretty }})</span>
                        </div>
                    </div>
                </a>
            </div>

            <div class="u-section u-container">
                <button class="bip-button bip-button--main" :class="{'is-loading': isFormSending, 'is-disabled': $v.$invalid}">
                    <span class="bip-button__content">Ping message</span>
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
</template>
