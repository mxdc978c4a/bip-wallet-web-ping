import createPersistedState from 'vuex-persistedstate';

export default ({store}) => {
    createPersistedState({
        paths: ['auth'],
    })(store);
    createPersistedState({
		key: 'ping',
        paths: ['pingProfiles', 'minterscanProfilesList', 'pingLikeList', 'pingTransactionList', 'pingIsPgpRegistered', 'pingChatList'],
    })(store);
};
