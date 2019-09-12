<script>
	import {debounce} from 'lodash-es';
	import getTitle from '~/assets/get-title';
	import {generateHashtagMx} from '~/assets/ping';
	
	import PingTable from '~/components/PingTable';
	
    export default {
        PAGE_TITLE: 'Ping Search',
        components: {
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
				searchText: this.$route.params.id,
				searchAddr: generateHashtagMx(''),
            };
        },
		watch:{ 
			"searchText":function(){
				this.debouncedGenerateMx();
			},
			"$route.params.id":function(){
				this.searchText= this.$route.params.id;
				this.generateMx();
			},
		},
		created: function(){
			this.generateMx();
			this.debouncedGenerateMx = debounce(this.generateMx, 500);
		},
		methods:{
			generateMx(){
				if(this.searchText == '' || !this.searchText){
					this.searchAddr = generateHashtagMx('');
				}
				else if(!/\B\#[\wА-Яа-я][\wА-Яа-я]+/g.test(this.searchText)){
					this.searchAddr = generateHashtagMx('#'+this.searchText);
				}
				else{
					this.searchAddr = generateHashtagMx(this.searchText);
				}
			}
		},
    };
</script>
<template id="main">
    <div>
		<!-- <style>
			.chat__loader {
				flex-grow: 1;
				display: flex;
				align-self: center;
				justify-content: center;
				user-select: none;
			}
			.chat__loader .spinner {
				position: relative;
				width: 30px;
				height: 30px;
				background-color: rgba(38,50,56,.5);
				border-radius: 50%;
				align-self: center;
			}
			.chat__loader .spinner:after {
				position: absolute;
				left: 4px;
				top: 4px;
				display: block;
				content: '';
				width: 22px;
				height: 22px;
				border-left-color: #fff;
				border-right-color: transparent;
				border-top-color: transparent;
				border-bottom-color: transparent;
				border-radius: 50%;
				border-width: 3px;
				border-style: solid;
				animation: spin .8s linear infinite;
			}

			@keyframes spin { 
				from { 
					transform: rotate(0deg); 
				} to { 
					transform: rotate(360deg); 
				}
			}
		</style>
		<div class="chat__loader">
			<div class="spinner"></div>
		</div> -->
		
		<div class="u-section u-container">
			<label class="bip-field bip-field--row">
				<input class="bip-field__input " type="text"
					   v-model.trim="searchText"
					   placeholder="What are you searching?"
				></input>
			</label>
		</div>
		<div class="list-title list-title--bold">Searched Pings</div>
		<PingTable :watchingAddr="searchAddr"/>
		
    </div>
</template>
