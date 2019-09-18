<script>
    import getTitle from '~/assets/get-title';
	import {isMinterAddress} from '~/assets/ping';

	import PingProfile from '~/components/PingProfile';
	import PingTable from '~/components/PingTable';
	import PingVifNotAuth from '~/components/PingVifNotAuth';
	
    export default {
        PAGE_TITLE: 'Ping Profile',
        components: {
			PingProfile,
			PingTable,
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
		computed: {
			profileMxAddr(){
				let address = this.$route.params.id;
				if(address && isMinterAddress(address)){
					return address;
				}
				return this.$store.getters.address;
			},
        },
        methods: {
		},
    };
</script>
<template id="main">
	<div>
		<div v-if="profileMxAddr != $store.getters.address || $store.getters.isAuthorized">
			<PingProfile :profileAddr="profileMxAddr"/>
			<div class="list-title list-title--bold">Latest Pings</div>
			<PingTable :watchingAddr="profileMxAddr"/>
		</div>
		<div v-else>
			<PingVifNotAuth />
		</div>
	</div>
</template>
