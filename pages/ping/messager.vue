<script>
    import getTitle from '~/assets/get-title';
	
	import {isMinterAddress, generateMxBySha1} from '~/assets/ping';
	import PingMessagerList from '~/components/PingMessagerList';
	import PingMessagerChat from '~/components/PingMessagerChat';
	
    export default {
        PAGE_TITLE: 'Ping Messager',
        components: {
			PingMessagerList,
			PingMessagerChat,
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
			isRouterParamsValid(){
				if(!this.$route.params.id){
					return false;
				}
				if(!isMinterAddress(this.$route.params.id)){
					return false;
				}
				return true;
			},
		},
        data() {
            return {
				profileAddress: this.$store.getters.address,
				likeAddr: generateMxBySha1(''),
            };
        },
    };
</script>
<template id="main">
    <div>
		<div v-if="isRouterParamsValid">
			<PingMessagerChat />
		</div>
		<div v-else>
			<PingMessagerList/>
		</div>
    </div>
</template>
