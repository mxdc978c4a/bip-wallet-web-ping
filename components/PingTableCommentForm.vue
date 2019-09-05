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
	import {getAvatarUrl, pretty, prettyExact} from '~/assets/utils';
	import getTitle from '~/assets/get-title';
	import Layout from '~/components/LayoutDefault';
	import Modal from '~/components/Modal';

	import {mapGetters, mapState} from 'vuex';
	import {generateMxBySha1, getCommentPrefix, generateCommentMx} from '~/assets/ping';
	import {debounce} from 'lodash-es';
	


	const isValidAmount = withParams({type: 'validAmount'}, (value) => {
	  return parseFloat(value) >= 0;
	});

	let recipientCheckData = null; // storage with latest recipient data to check
	let recipientCheckCancel;
	let recipientError = {
	  username: {},
	  email: {},
	};

	let feeBus;

	const postPrefix = getCommentPrefix();
    export default {
        PAGE_TITLE: 'comment',
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
            prettyExact,
        },
		props: {
			txProp:{
				type: Object,
				required: true,
			}
		},
        data() {
            const coinList = this.$store.state.balance;

            return {
                isFormSending: false,
                serverError: '',
				hashtagListLenght: 2,
                form: {
					list: [],
                    coinSymbol: 'PING',
                    // address or public key
                    //address: generateMxBySha1(''),
					//address: this.$store.getters.address,
                    // amount or stake
                    amount: '0',
                    message: '',
					tag: '',
                },
                sve: {
                    address: {invalid: false, isActual: false, message: ''},
                },
                recipient: {
                    name: '',
                    address: '',
                    type: '',
                },
                // saved recipient entry for success modal
                lastRecipient: {
                    name: '',
                    address: '',
                    type: '',
                },
                recipientCheckTimer: null,
                recipientLoading: false, // latest recipient value sent to check and still loading
                amountImaskOptions: {
                    mask: Number,
                    scale: 18, // digits after point, 0 for integers
                    signed: false,  // disallow negative
                    thousandsSeparator: '',  // any single char
                    padFractionalZeros: false,  // if true, then pads zeros at end to the length of scale
                    normalizeZeros: false, // appends or removes zeros at ends
                    radix: '.',  // fractional delimiter
                    mapToRadix: [','],  // symbols to process as radix
                },
                // amountMasked: '',
                /** @type FeeData */
                fee: {},
                isUseMax: false,
                isModalOpen: false,
                isWaitModalOpen: false,
                isSuccessModalOpen: false,

                successHash: '',
            };
        },
        validations() {
            return {
                form: {
                    message: {
						required,
                        maxLength: maxLength(1024),
                    },
					tag:{
						minLength: minLength(3),
						maxLength: maxLength(20),
					},
                },
            };
        },
        computed: {
            ...mapState({
                txList: (state) => state.twitterTransactionListInfo.data || [],
                balance: 'balance',
                delegation: 'delegation',
            }),
			...mapGetters([
                'username',
                'address',
                'baseCoin',
            ]),
			balanceParts() {
                const parts = this.baseCoin ? pretty(this.baseCoin.amount).split('.') : [];
                return {
                    whole:  parts[0] ? parts[0] : 0,
                    decimal: parts[1] ? '.' + parts[1] : '',
                };
            },
            isRecipientCheckWait() {
                return this.recipientLoading || this.recipientCheckTimer;
            },
            maxAmount() {
                let selectedCoin;
                this.$store.state.balance.some((coin) => {
                    if (coin.coin === this.form.coinSymbol) {
                        selectedCoin = coin;
                        return true;
                    }
                });
                // coin not selected
                if (!selectedCoin) {
                    return '0';
                }
                // fee not in selected coins
                if (selectedCoin.coin !== this.fee.coinSymbol) {
                    return selectedCoin.amount;
                }
                // fee in selected coin, subtract fee
                const amount = new Big(selectedCoin.amount).minus(this.fee.value).toFixed();
                return amount > 0 ? amount : '0';
            },
            feeBusParams() {
                return {
                    txType: TX_TYPE_MULTISEND,
                    txFeeOptions: {payload: postPrefix+this.form.message, multisendCount: this.hashtagListLenght},
                    selectedCoinSymbol: this.form.coinSymbol,
                    selectedFeeCoinSymbol: this.form.coinSymbol,
                    baseCoinAmount: this.$store.getters.baseCoin && this.$store.getters.baseCoin.amount,
                    // isOffline: this.$store.getters.isOfflineMode,
                };
            },
        },
		beforeMount() {
        },
        watch: {
			"form.tag": function(){
				this.form.address = generateMxBySha1(this.form.tag);
				//console.log(this.form.address);
				this.$store.dispatch('FETCH_SEARCH_MX_BY_TAG', this.form.tag);
				//this.$store.dispatch('FETCH_SET_TAG', this.form.tag);
				//console.log(this.$store.state.tag)
				//console.log(this.$store.getters.address);

			},
			"form.message": function(){
				//this.debouncedGetHashtagList();
				this.getHashtagList();
			},
            //@TODO loading indicator instead of error
            'recipient.name': {
                handler(newVal) {
                    this.form.address = '';
                    this.recipient.type = '';
                    recipientCheckData = null;
                    this.clearRecipientTimer();
                    if (!newVal) {
                        return;
                    }
                    if (newVal.substr(0, 2) === 'Mx') {
                        this.recipient.type = 'address';
                        // address
                        if (newVal.length !== 42) {
                            this.setAddressError('Wrong address length');
                            return;
                        }
                        if (!/^Mx[0-9abcdefABCDEF]*$/.test(newVal)) {
                            this.setAddressError('Wrong address');
                            return;
                        }
                        this.form.address = newVal;
                        this.recipient.address = newVal;
                    } else if (newVal.substr(0, 2) === 'Mp') {
                        this.recipient.type = 'publicKey';
                        // public key
                        if (newVal.length !== 66) {
                            this.setAddressError('Wrong public key length');
                            return;
                        }
                        if (!/^Mp[0-9abcdefABCDEF]*$/.test(newVal)) {
                            this.setAddressError('Wrong public key');
                            return;
                        }
                        this.form.address = newVal;
                        this.recipient.address = newVal;
/*
                    } else if (newVal.substr(0, 1) === '@') {
                        // username
                        if (!/^@\w*$/.test(newVal)) {
                            this.setAddressError('Wrong username');
                            return;
                        }
                        recipientCheckData = {username: newVal.substr(1)};
                        this.recipient.type = 'username';
                        this.recipientCheckTimer = setTimeout(this.checkRecipient, 1000);
                    } else if (newVal.indexOf('@') !== -1) {
                        // email
                        recipientCheckData = {email: newVal};
                        this.recipient.type = 'email';
                        this.recipientCheckTimer = setTimeout(this.checkRecipient, 1000);
*/
                    } else {
                        // wrong recipient
                        this.setAddressError('Wrong recipient');
                    }
                },
            },
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
			//Create debounce for getHashtagList
			//this.debouncedGetHashtagList = debounce(this.getHashtagList, 500);
			
            feeBus = new FeeBus(this.feeBusParams);
            this.fee = feeBus.fee;
            feeBus.$on('updateFee', (newVal) => {
                this.fee = newVal;
                if (this.isUseMax) {
                    // update form amount to consider updated feeValue
                    this.useMax();
                }
            });
        },
        methods: {
			getHashtagList(){
				this.setListToComment();
				/*
				//let hashtags = this.form.message.match(/\B\#\w\w+\b/g);
				let hashtags = this.form.message.match(/\B\#[\wА-Яа-я][\wА-Яа-я]+/g);
				
				if(hashtags == null){
				//this.$store.getters.address
					this.form.list = [{value: 0, coin: 'PING', to: this.$store.getters.address}, {value: 0, coin: 'PING', to: generateMxBySha1('')}]
					this.hashtagListLenght = 2;
				}else{
					//get Unique hashtags
					let uniqueHashtags = hashtags.filter(function(elem, pos){
						return hashtags.indexOf(elem)==pos;
					});
					this.hashtagListLenght = uniqueHashtags.length;
					// hash unique hashtag and create array
					this.form.list = uniqueHashtags.map(function(tag){
						return {value: 0, coin: 'PING', to: generateMxBySha1(tag)};
					});
					// add getters.address
					this.form.list.unshift({value: 0, coin: 'PING', to: this.$store.getters.address});
				}
				*/

			},
			setListToComment(){
				let toAddress = generateCommentMx(this.txProp.block, this.txProp.txn);
				//console.log(toAddress);
				this.form.list = [{value: 0, coin: 'PING', to: toAddress}]
				/*
				this.form.list = this.txProp.data.list.map(function(el, id){
					if(id < 2){
						return {value: 0, coin: 'PING', to: el.to}
					}
				})
				*/
				//console.log('heehhe', this.form.list);
			},
            // force check after blur if needed
            recipientBlur() {
                if (
                    this.recipientCheckTimer // check was postponed
                    ||
                    (this.recipientLoading && this.recipientLoading !== this.recipient.name) // checking in progress and recipient value changed from last check
                ) {
                    this.clearRecipientTimer();
                    this.checkRecipient();
                }
            },
            clearRecipientTimer() {
                clearTimeout(this.recipientCheckTimer);
                this.recipientCheckTimer = null;
            },
            checkRecipient() {
                // cancel previous request
                this.clearRecipientTimer();
                if (this.recipientLoading && typeof recipientCheckCancel === 'function') {
                    recipientCheckCancel();
                }
                // check only username and email
                if (this.recipient.type !== 'username' && this.recipient.type !== 'email') {
                    return;
                }
                // new request
                this.recipientLoading = this.recipient.name;
                getAddressInfoByContact(recipientCheckData, new axios.CancelToken((cancelFn) => {
                    recipientCheckCancel = cancelFn;
                }))
                    .then((userInfo) => {
                        this.form.address = userInfo.address;
                        this.recipient.address = userInfo.address;
                        // @TODO user stored users
                        this.recipientLoading = false;
                    })
                    .catch((error) => {
                        recipientError = {
                            username: {},
                            email: {},
                        };
                        if (fillServerErrors(error, recipientError)) {
                            // validation error
                            Object.keys(recipientError).forEach((key) => {
                                if (recipientError[key].message) {
                                    this.setAddressError(recipientError[key].message);
                                }
                            });
                        } else if (error.response && error.response.status && error.response.status < 500) {
                            // server expected error
                            const errorCode = getErrorCode(error);
                            if (errorCode === 'not_found') {
                                if (this.recipient.type === 'username') {
                                    this.setAddressError(`Can't find address for username "${this.recipient.name}"`);
                                }
                                if (this.recipient.type === 'email') {
                                    this.setAddressError(`Can't find address for e-mail "${this.recipient.name}"`);
                                }
                            } else {
                                this.setAddressError(getErrorText(error, ''));
                            }
                        } else {
                            // unexpected error
                            this.setAddressError('Can\'t get address from server');
                        }
                        this.recipientLoading = false;
                    });
            },
            setAddressError(message, code) {
                this.sve.address = {invalid: true, isActual: true, message, code};
            },
            onAcceptAmount(e) {
                // this.amountMasked = e.detail._value;
                this.form.amount = e.detail._unmaskedValue;
                this.isUseMax = false;
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
                this.lastRecipient = Object.assign({}, this.recipient);
                this.isFormSending = true;
                this.isModalOpen = false;
                this.isWaitModalOpen = true;
                this.serverError = '';
				this.setListToComment();
                this.$store.dispatch('FETCH_ADDRESS_ENCRYPTED')
                    .then(() => {
                        let txParams;
						txParams = new MultisendTxParams({
							privateKey: this.$store.getters.privateKey,
							...this.form,
							message: postPrefix+this.form.message,
							feeCoinSymbol: this.fee.coinSymbol,
						});

                        postTx(txParams).then((txHash) => {
                            this.isFormSending = false;
                            this.isWaitModalOpen = false;
                            this.isSuccessModalOpen = true;
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
            useMax() {
                this.form.amount = this.maxAmount;
                // this.amountMasked = this.maxAmount;
                this.$refs.amountInput.maskRef.typedValue = this.maxAmount;
                this.isUseMax = true;
            },
            clearForm() {
                this.form.message = '';
                this.form.tag = '';
                this.$v.$reset();
            },

        },
    };
</script>

<template>
    <div>
		<form novalidate @submit.prevent="openTxModal" v-if="$store.state.balance && $store.state.balance.length">
            <div class="u-section u-container">
                <label class="bip-field bip-field--row" :class="{'is-error': $v.form.message.$error}">
                    <textarea class="bip-field__input " type="text"
                           v-model.trim="form.message"
                           @blur="$v.form.message.$touch();"
						   placeholder="What’s happening?"
						   :style="{height: '150px'}"
                    ></textarea>
                    <span class="form-field__error" v-if="$v.form.message.$dirty && !$v.form.message.maxLength">Max 1024 symbols</span>
					<span class="bip-field__error" v-if="$v.form.message.$dirty && !$v.form.message.required">Enter message</span>
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
                    <span class="bip-button__content">Ping comment</span>
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
                    <button class="bip-button bip-button--main" @click="sendTx">Ping comment</button>
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

        <!-- success modal -->
		<!--
        <Modal :isOpen.sync="isSuccessModalOpen" :hideCloseButton="true">
            <div class="modal__panel">
                <h3 class="modal__title u-h2">Success</h3>
                <div class="modal__content">
                    <p>Coins are received by</p>
                    <p>
                        <img class="send__modal-image avatar avatar--large" :src="getAvatar(lastRecipient)" alt="" role="presentation">
                    </p>
                    <p class="u-text-wrap"><strong>{{ lastRecipient.name }}</strong></p>
                </div>
                <div class="modal__footer">
                    <a class="bip-button bip-button--ghost-main" :href="getExplorerTxUrl(serverSuccess)" target="_blank">View Transaction</a>
                    <button class="bip-button bip-button--ghost-main" @click="isSuccessModalOpen = false">Close</button>
                </div>
            </div>
        </Modal>
		-->
    </div>
</template>
