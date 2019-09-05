<script>
	import Layout from '~/components/LayoutDefault';

	export default {
		PAGE_TITLE: 'Ping',
		components: {
			Layout,
		},
		mounted() {
			this.$store.dispatch('FETCH_PING_MINTERSCAN_PROFILES_LIST');
		},
	};
</script>
<template id="main" v-if="$store.getters.isAuthorized">
	<Layout :is-bg-white="true"  :title="$options.PAGE_TITLE">
		<template slot="menuSlot">
			<div class="menu">
				<menu class="menu__container u-container">
					<li class="menu__item">
						<nuxt-link class="menu__link" to="/ping/" exact>⛪️</nuxt-link>
					</li>
					<li class="menu__item">
						<nuxt-link class="menu__link" to="/ping/profile">👨</nuxt-link>
					</li>
					<li class="menu__item">
						<nuxt-link class="menu__link" to="/ping/search">#</nuxt-link>
					</li>
					<li class="menu__item">
						<nuxt-link class="menu__link" to="/ping/notification">🔔</nuxt-link>
					</li>
					<li class="menu__item">
						<nuxt-link class="menu__link" to="/ping/messager">✉</nuxt-link>
					</li>
					<li class="menu__item">
						<nuxt-link class="menu__link" to="/ping/setting">⚙</nuxt-link>
					</li>
					<!-- <li class="menu__item">
					<nuxt-link class="menu__link" to="/ping/profile/Mxdc97b7d19a84bf7ac19a8fc7867e7cb3e5555555">🔖</nuxt-link>
					</li> -->
				</menu>
			</div>
		</template>
		<nuxt-child/>
	</Layout>
</template>
