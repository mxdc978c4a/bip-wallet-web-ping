<script>
    /**
     * Nuxt way layout
     * @see https://github.com/nuxt/nuxt.js/issues/190#issuecomment-277304451
     * */
    import Navbar from '~/components/Navbar';

    export default {
        components: {
            Navbar,
        },
        props: {
            title: {
                type: String,
            },
            isBgWhite: {
                type: Boolean,
                default: false,
            },
            backUrl: {
                type: String,
            },
        },
    };
</script>

<template>
    <div>
        <header class="header">
            <div class="toolbar-wrap">
                <slot name="toolbar">
                    <Navbar :title="title" :back-url="backUrl"/>
                </slot>
            </div>
            <div class="menu" v-if="$store.getters.isAuthorized">
                <menu class="menu__container u-container">
                    <li class="menu__item">
                        <nuxt-link class="menu__link" to="/" exact>Coins</nuxt-link>
                    </li>
                    <li class="menu__item">
                        <nuxt-link class="menu__link" to="/send">Send</nuxt-link>
                    </li>
                    <li class="menu__item">
                        <nuxt-link class="menu__link" to="/receive">Receive</nuxt-link>
                    </li>
                    <li class="menu__item">
                        <nuxt-link class="menu__link" to="/settings">Settings</nuxt-link>
                    </li>
                    <li class="menu__item">
                        <nuxt-link class="menu__link" to="/ping">Ping</nuxt-link>
                    </li>
                </menu>
            </div>
			<slot name="menuSlot"></slot>
        </header>

        <div class="default-layout__content-wrap">
            <div class="default-layout__content" :class="{'u-bg-white': isBgWhite}">

                <slot></slot>

            </div>
        </div>

        <slot name="toast"></slot>
    </div>
</template>
