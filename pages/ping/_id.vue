<script>
    import getTitle from '~/assets/get-title';
	import {isMinterAddress, generateMxBySha1, generateCommentMx} from '~/assets/ping';

	import PingProfile from '~/components/PingProfile';
	import PingTableOnePost from '~/components/PingTableOnePost';PingTable
	import PingTable from '~/components/PingTable';
	
    export default {
        PAGE_TITLE: 'Ping Profile',
        components: {
			PingProfile,
			PingTableOnePost,
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
				postTx: {},
				txLikes: {},
			};
        },
		beforeMount(){
			this.updateTxList();
		},
		watch:{
			"$route.params.id": function(){
				this.updateTxList();
			},
			"$store.state.balance": function(){
				this.updateTxList();
			},
		},
		computed: {
			getRouteParamId(){
				let params = this.$route.params.id.split("-");
				if(params[0] && params[1] && !params[2]){
					return generateCommentMx(params[0], params[1]);
				}
				/*
				if(this.$route.params.id){
					return this.$route.params.id
				}
				*/
				return '';
			},
        },
        methods: {
			profileMxAddr(){
				return this.postTx.from;
			},
			getTxList(){
				return [this.postTx];
			},
			updateTxList(){
				const params = this.$route.params.id.split("-");
				if(params[0] && params[1] && !params[2]){
					const storeTx = this.$store.state.pingPostList[params[0]+params[1]];
					if(storeTx){
						this.postTx=storeTx;
					}
					else{
						this.$store.dispatch('FETCH_PING_POST_LIST', {block: params[0], txn: params[1]})
							.then((tx) => {
								this.postTx = tx;
							})
							.catch((error) => {
								console.log(error);
							});
					}
				};
			},
		},
    };
</script>
<template id="main">
    <div>		
		<PingTableOnePost :txProp="postTx"/>
		
		<!-- <div>test {{postTx}}</div> -->
		<!-- <PingProfile :profileAddr="profileMxAddr"/> -->
		
		<div class="list-title list-title--bold">Latest Comments</div>
		<PingTable :watchingAddr="getRouteParamId"/>
    </div>
</template>
