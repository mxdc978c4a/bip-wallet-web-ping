<script>
    import {generateMnemonic} from 'minterjs-wallet';
    import {validationMixin} from 'vuelidate';
    import withParams from 'vuelidate/lib/withParams';
    import {req} from 'vuelidate/lib/validators/common';
    import * as clipboard from 'clipbrd';
    import getTitle from '~/assets/get-title';
    import {addressFromMnemonic} from "minter-js-org";
    import Layout from '~/components/LayoutDefault';
    import Toast from '~/components/Toast';

    // checkbox validator
    const checked = withParams({ type: 'checked' }, (value) => {
        return !req(value) || value === true;
    });

    export default {
        PAGE_TITLE: 'Generate Address',
        components: {
            Layout,
            Toast,
        },
        mixins: [validationMixin],
        head() {
            return {
                title: getTitle(this.$options.PAGE_TITLE),
                meta: [
                    { hid: 'og-title', name: 'og:title', content: getTitle(this.$options.PAGE_TITLE) },
                ],
            };
        },
        data() {
            return {
                mnemonic: '',
                isMnemonicSaved: false,
                isToastVisible: false,
            };
        },
        validations: {
            isMnemonicSaved: {
                checked,
            },
        },
        computed: {
            isClipboardSupported() {
                return clipboard.isSupported();
            },
        },
        mounted() {
            this.mnemonic = generateMnemonic();
        },
        methods: {
            copyMnemonic() {
                clipboard.copy(this.mnemonic);
                this.isToastVisible = true;
            },
            authorize() {
                if (this.$v.$invalid) {
                    this.$v.$touch();
                    return;
                }
                // clear old format stored data
                this.$store.commit('LOGOUT');
                this.$store.commit('ADD_AUTH_ADVANCED', addressFromMnemonic(this.mnemonic, true));
                this.$router.push('/');
            },
        },
    };
</script>

<template>
    <Layout :title="$options.PAGE_TITLE" :is-bg-white="true" back-url="/auth/sign-in-advanced">

        <div class="u-section u-container">
            Save this seed phrase in case you plan to use this address in the future.
        </div>
        <div class="list">
            <div class="list-item">
                <div class="list-item__center list-item--address__seed-phrase">{{ mnemonic }}</div>
                <div class="list-item__right" v-if="isClipboardSupported">
                    <button class="bip-link u-semantic-button" @click="copyMnemonic">Copy</button>
                </div>
            </div>
            <!--<a class="list-item list-item&#45;&#45;tappable list-item&#45;&#45;chevron">
                <div class="list-item__center">Secured by</div>
                <div class="list-item__right list-item&#45;&#45;chevron__right">
                    <div class="list-item__label list-item__label&#45;&#45;strong">Bip Wallet</div>
                </div>
            </a>-->
            <div class="list-item">
                <div class="list-item__center">I've saved the phrase!</div>
                <div class="list-item__right">
                    <label class="switch">
                        <input type="checkbox" class="switch__input" v-model="isMnemonicSaved">
                        <span class="switch__toggle">
                            <span class="switch__handle"></span>
                        </span>
                    </label>
                </div>
            </div>
        </div>
        <div class="u-section u-container">
            <button class="bip-button bip-button--main" :class="{'is-disabled': !isMnemonicSaved}" @click="authorize">Launch the Wallet</button>
            <span class="bip-form__error" v-if="$v.isMnemonicSaved.$error">You need to save the phrase</span>
        </div>

        <template slot="toast">
            <Toast text="Copied to clipboard" :isVisible.sync="isToastVisible"/>
        </template>


    </Layout>
</template>

