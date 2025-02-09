import Vue from 'vue';
import {setAuthToken, resetAuthToken} from "~/api/accounts";

export default {
    SET_AUTH_PROFILE: (state, {user, token, password}) => {
        SET_PROFILE_USER(state, user);
        state.auth.password = password;
        setAuthToken(token);
    },
    ADD_AUTH_ADVANCED: (state, address) => {
        state.auth.advanced.push(address);
    },
    DELETE_ADVANCED_ADDRESS: (state, addressHash) => {
        state.auth.advanced.some((address, index) => {
            if (address.address === addressHash) {
                state.auth.advanced.splice(index, 1);
                return true;
            }
        });
    },
    SET_MAIN_ADVANCED_ADDRESS: (state, addressHash) => {
        state.auth.advanced.some((address) => {
            if (address.address === addressHash) {
                address.isMain = true;
                return true;
            }
        });
    },
    LOGOUT: (state) => {
        state.user = {};
        state.auth.password = null;
        state.auth.advanced = [];
        // clear data
        state.balance = [];
        state.profileAddressList = [];
        state.transactionListInfo = {
            data: [],
            meta: {},
        };
		state.pingProfiles= {};
		state.pingTransactionList= {};
		state.minterscanProfilesList= {};
		state.pingLikeList= {};
		state.pingIsPgpRegistered= false;
		state.pingPgpList={};
		state.pingPostList={};
		state.pingChatList={};
		state.pingChats={};
		
        resetAuthToken();
    },
    SET_PROFILE_USER,
    UPDATE_PROFILE_PASSWORD: (state, password) => {
        state.auth.password = password;
    },
    CHECK_MAIN_ADDRESS,
    SET_PROFILE_ADDRESS_LIST: (state, addressList) => {
        CHECK_MAIN_ADDRESS(state, addressList);
        // @TODO saves only first encrypted (not compatible with multiple addresses)
        // save encrypted data
        const addressWithEncrypted = state.profileAddressList.find((addressItem) => addressItem.encrypted);
        if (addressWithEncrypted) {
            addressList.some((addressItem) => {
                if (addressItem.id === addressWithEncrypted.id) {
                    addressItem.encrypted = addressWithEncrypted.encrypted;
                    return true;
                }
            });
        }
        state.profileAddressList = addressList;
    },
    SET_PROFILE_ADDRESS_ENCRYPTED: (state, address) => {
        state.profileAddressList.some((addressItem, index) => {
            if (addressItem.id === address.id) {
                // use Array instance methods to notify Vue reactivity system
                state.profileAddressList.splice(index, 1, address);
                return true;
            }
        });

    },
    SET_TRANSACTION_LIST: (state, txListInfo) => {
        state.transactionListInfo = txListInfo;
    },
    SET_BALANCE: (state, balance) => {
        state.balance = balance;
    },
    SET_BALANCE_SUM: (state, balanceData) => {
        state.balanceSum = balanceData.balanceSumInBaseCoin;
        state.balanceSumUsd = balanceData.balanceSumInUSD;
    },
    SET_DELEGATION: (state, delegation) => {
        state.delegation = delegation;
    },
    ADD_USER,
    PUSH_HISTORY: (state, historyItem) => {
        state.history.push(historyItem);
    },
    POP_HISTORY: (state) => {
        state.history.pop();
    },
	PING_PROFILE_LIST: (state, data) => {
		state.pingProfiles = Object.assign({}, state.pingProfiles, data);
	},
	PING_TRANSACTION_LIST: (state, data) => {
		state.pingTransactionList = Object.assign({}, state.pingTransactionList, data);
	},
	PING_MINTERSCAN_PROFILES_LIST: (state, data) => {
		state.minterscanProfilesList = Object.assign({}, state.minterscanProfilesList, data);
	},
	PING_LIKE_LIST: (state, data) => {
		state.pingLikeList = Object.assign({}, state.pingLikeList, data);
	},
	PING_PGP_REGISTER: (state) => {
		state.pingIsPgpRegistered = true;
	},
	PING_PGP_LIST: (state, data) => {
		state.pingPgpList = Object.assign({}, state.pingPgpList, data);
	},
	PING_POST_LIST: (state, data) => {
		state.pingPostList = Object.assign({}, state.pingPostList, data);
	},
	PING_CHAT_LIST: (state, data) => {
		state.pingChatList = Object.assign({}, state.pingChatList, data);
	},
	PING_CHATS: (state, data) => {
		state.pingChatList = Object.assign({}, state.pingChatList, data);
	},
	PING_UPDATE_TABLE: (state, data) => {
		state.pingUpdateTable = state.pingUpdateTable + 1;
	},
	
	
};

function SET_PROFILE_USER(state, profile) {
    state.user = profile;
    if (profile.mainAddress && profile.mainAddress.address) {
        ADD_USER(state, {address: profile.mainAddress.address, user: profile});
    }
}

function CHECK_MAIN_ADDRESS(state, newProfileAddressList) {
    let isProfileAddressMain = newProfileAddressList.some((address) => {
        if (address.isMain) {
            return true;
        }
    });
    if (isProfileAddressMain) {
        state.auth.advanced.forEach((address) => {
            address.isMain = false;
        });
    }
}

/**
 * @param state
 * @param {UserInfo} userInfo
 */
function ADD_USER(state, userInfo) {
    Vue.set(state.userList, userInfo.address, userInfo.user);
}
