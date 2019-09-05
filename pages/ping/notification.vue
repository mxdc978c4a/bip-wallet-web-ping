<script>
    import getTitle from '~/assets/get-title';
	
	
    export default {
        PAGE_TITLE: 'Ping Notification',
        components: {
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
            };
        },
    };
</script>
<template id="main">
    <div>
		<div class="list-title list-title--bold">Work in progress</div>
    </div>
</template>
