<script>
	import getTitle from '~/assets/get-title';
	import PingProfile from '~/components/PingProfile';
	import PingPostForm from '~/components/PingPostForm';
	
	
	import PingTable from '~/components/PingTable';
	import {generateMxBySha1, mainAddress} from '~/assets/ping';
	
	export default {
		PAGE_TITLE: 'Ping Home',
		components: {
			PingProfile,
			PingPostForm,
			PingTable,
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
				likeAddr: mainAddress,
			};
		},
	};
</script>
<template id="main" v-if="$store.getters.isAuthorized">
	<div>
		<PingProfile :profileAddr="profileAddress"/>
		<PingPostForm/>
		<div class="list-title list-title--bold">Recomended Pings</div>
		<PingTable :watchingAddr="likeAddr" />
	</div>
</template>
