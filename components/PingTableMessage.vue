<script>
    import {fromBase64} from "~/assets/utils";
	import {prefixLenght} from '~/assets/ping';
	
/*	
	function linkify(inputText) {
		var replacedText, replacePattern1, replacePattern2, replacePattern3;

		//URLs starting with http://, https://, or ftp://
		replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
		replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

		//URLs starting with "www." (without // before it, or it'd re-link the ones done above).
		replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
		replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

		//Change email addresses to mailto:: links.
		replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
		replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

		return replacedText;
	}
*/
		
    export default {
        props: {
            txProp: {
                type: Object,
                required: true,
            },
        },
        computed: {
			getMessage(){
				let message = fromBase64(this.txProp.payload);
				message = message.substring(prefixLenght);
				message = message.replace(/\B\#([\wА-Яа-я][\wА-Яа-я]+)/g,'<span class="ping-list pingHashtagLink" @click.stop="onHashtagClick(\'$1\')">#$1</span>');
				message = '<div>'+message+'</div>';
				return {
					name: 'dynamicHashtags', 
					template: message, 
					methods:{
						onHashtagClick(hashtag){
							this.$router.push('/ping/search/'+hashtag);
						},
					} 
				};
			},
		},
    };
</script>

<template>
    <div :is="getMessage"></div>
</template>
