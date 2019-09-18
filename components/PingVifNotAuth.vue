<script>
    export default {
        methods: {
			openLogin(){
				this.$router.push('/auth/sign-in-advanced');
			},
        },
    };
</script>
<template>
	<div>
		<div class="u-section u-container">
			<button class="bip-button bip-button--main" @click="openLogin()">
				<span class="bip-button__content" v-if="!isRegistered">
					LOGIN
				</span>
			</button>
		</div>
	</div>
</template>