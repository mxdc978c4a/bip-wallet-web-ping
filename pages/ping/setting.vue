<script>
    import getTitle from '~/assets/get-title';
	import {isMinterAddress} from '~/assets/ping';

	import PingProfile from '~/components/PingProfile';
	import PingInitPgpForm from '~/components/PingInitPgpForm';
	import PingVifNotAuth from '~/components/PingVifNotAuth';
	
    export default {
        PAGE_TITLE: 'Ping Setting',
        components: {
			PingProfile,
			PingInitPgpForm,
			PingVifNotAuth,
        },
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
				profileAddress: this.$store.getters.address,
            };
        },
		computed: {
        },
        methods: {
		},
    };
</script>
<template id="main">
    <div>
		<div v-if="$store.getters.isAuthorized">
			<PingProfile :profileAddr="profileAddress"/>
			<div class="u-section u-container">
				<PingInitPgpForm/>
			</div>
			<div class="u-section u-container">
				Visit the <a href='https://minterscan.net/faq/profile' target="_blank">MinterScan web-site</a> to register your own profile.
			</div>
		</div>
		<div v-else>
			<PingVifNotAuth />
		</div>
    </div>
</template>
