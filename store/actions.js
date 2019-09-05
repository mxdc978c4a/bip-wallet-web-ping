import * as TX_TYPES from 'minterjs-tx/src/tx-types';
import {getBalance, getDelegation, getProfile, getProfileAddressList, getProfileAddressEncrypted, getAddressTransactionList, getAddressListInfo, getCoinList, getMinterscanProfiles, getBlockTransactionList} from "~/api";
import {pgpKeyAdress, likeAddress, decodeMx, isLike, isPgpKey, isPrivateMessage, prefixLenght} from '~/assets/ping';
import {fromBase64} from '~/assets/utils';


let activeCoinListPromise;
let coinListTime = 0;

export default {
    FETCH_PROFILE: ({ commit }) => {
        return getProfile()
            .then((profile) => commit('SET_PROFILE_USER', profile));
    },
    FETCH_PROFILE_ADDRESS_LIST: ({ commit, getters }) => {
        //@TODO is it required to update address list each time?
        if (getters.isUserWithProfile) {
            return getProfileAddressList().then((addressList) => {
                commit('SET_PROFILE_ADDRESS_LIST', addressList);
                return addressList;
            });
        } else {
            return Promise.resolve();
        }
    },
    FETCH_ADDRESS_ENCRYPTED: ({ state, commit, getters, dispatch }) => {
        if (getters.isUserAdvanced || (getters.mainProfileAddress && getters.mainProfileAddress.encrypted)) {
            return Promise.resolve();
        }
        // ensure mainProfileAddress exists
        let mainProfileAddressPromise;
        if (getters.mainProfileAddress) {
            mainProfileAddressPromise = Promise.resolve(getters.mainProfileAddress);
        } else {
            mainProfileAddressPromise = dispatch('FETCH_PROFILE_ADDRESS_LIST');
        }

        return mainProfileAddressPromise
            .then(() => getProfileAddressEncrypted(getters.mainProfileAddress.id))
            .then((address) => commit('SET_PROFILE_ADDRESS_ENCRYPTED', address));
    },
    FETCH_TRANSACTION_LIST: ({ commit, dispatch, getters }, page = 1) => {
        // use only 1 address
        return getAddressTransactionList(getters.address, {
            page: page || 1,
        })
            .then((txListInfo) => {
                // commit only first page
                if (!(page > 2)) {
                    commit('SET_TRANSACTION_LIST', txListInfo);
                }
                // fetch avatars and usernames for addresses found in txs
                const addressListToFetch = txListInfo.data.reduce((accum, tx) => {
                    if (tx.type === Number(TX_TYPES.TX_TYPE_SEND)) {
                        if (tx.data.to === getters.address) {
                            accum.add(tx.from);
                        } else {
                            accum.add(tx.data.to);
                        }
                    }
                    return accum;
                }, new Set());
                dispatch('FETCH_USERS', Array.from(addressListToFetch));
                return txListInfo;
            });
    },
    FETCH_BALANCE: ({ commit, getters }) => {
        // use only 1 address
        return getBalance(getters.address)
            .then((balanceData) => {
                commit('SET_BALANCE', balanceData.balances);
                commit('SET_BALANCE_SUM', balanceData);
                return balanceData.balances;
            });
    },
    FETCH_DELEGATION: ({ commit, getters }) => {
        // use only 1 address
        return getDelegation(getters.address)
            .then((delegation) => {
                commit('SET_DELEGATION', delegation);
                return delegation;
            });
    },
    FETCH_USERS: ({ state, commit }, addressList) => {
        // fetch only new addresses
        addressList = addressList.filter((address) => !state.userList[address]);
        if (!addressList.length) {
            return Promise.resolve();
        }
        return getAddressListInfo(addressList)
            .then((userInfoList) => {
                userInfoList.forEach((userInfo) => {
                    commit('ADD_USER', userInfo);
                });
            });
    },
    FETCH_COIN_LIST: () => {
        if (Date.now() - coinListTime > 60 * 1000) {
            activeCoinListPromise = getCoinList();
            coinListTime = Date.now();
        }
        return activeCoinListPromise;
    },
	FETCH_PING_PROFILE: ({ commit }, address) => {
        return getBalance(address)
            .then((balanceData) => {
				let temp = {};
				temp[address] = balanceData;
                commit('PING_PROFILE_LIST', temp);
                return balanceData.balances;
            });
	},
	FETCH_PING_TRANSACTION_LIST: ({ commit },  params={page: 1, address: ''}) => {
		return getAddressTransactionList(params.address, {
            page: params.page || 1,
			limit: 50,
        })
            .then((txListInfo) => {
				let temp = {};
				temp[params.address] = txListInfo;
				commit('PING_TRANSACTION_LIST', temp);
                return txListInfo;
            });
	},
	FETCH_PING_MINTERSCAN_PROFILES_LIST: ({ commit }) => {
		return getMinterscanProfiles()
			.then((profileListInfo) => {
				let temp = {};
				profileListInfo.forEach((el)=>{
					temp[el.address] = el.profile;
				})
				commit('PING_MINTERSCAN_PROFILES_LIST', temp);
			})
    },
	FETCH_PING_LIKE_LIST: ({ commit }) => {
		let address = likeAddress
		let page = 1;
		return getAddressTransactionList(address, {
            page: page || 1,
			limit: 500,
        })
			.then((txListInfo) => {
				let temp = {};
				for(const tx of txListInfo.data){
					if(isLike(tx)){
						const likeTo = decodeMx(tx.data.list[1].to);
						temp[tx.from+likeTo.a.toString()+likeTo.b.toString()] = tx.data.list[1].to;
						//temp[tx.from+likeTo.a.toString()+likeTo.b.toString()].meta = {block: likeTo.a, txn: likeTo.b};
					}
				};
				commit('PING_LIKE_LIST', temp);
				return temp;
			})
	},
	FETCH_PING_PGP_REGISTER: ({ commit }) => {
		commit('PING_PGP_REGISTER');
	},
	FETCH_PING_PGP_LIST: ({ commit }) => {
		let address = pgpKeyAdress;
		let page = 1;
		return getAddressTransactionList(address, {
            page: page || 1,
			limit: 1000,
        })
            .then((txListInfo) => {
				let temp = {};
				for(const tx of txListInfo.data){
					if(isPgpKey(tx)){
						temp[tx.from] = fromBase64(tx.payload).slice(prefixLenght);						
					}
				}
				commit('PING_PGP_LIST', temp);
                return temp;
            });
	},
	FETCH_PING_POST_LIST: ({ commit }, params={block: 0, txn: 0}) => {
		if(params.block == 0 && params.txn == 0){
			return [];
		};
		return getBlockTransactionList(params.block, {page: 1})
			.then((txListInfo) => {
				txListInfo = txListInfo.data.filter(function(el){
					return el.txn == params.txn
				})
				return txListInfo[0]
			})
			.then((tx) => {
				const temp = {};
				temp[tx.block.toString()+tx.txn.toString()] = tx;
				commit('PING_POST_LIST', temp);
				return tx;
			});
	},
	
	FETCH_PING_CHAT_LIST: ({ commit, getters }) => {
        return getAddressTransactionList(getters.address, {
            page: 1,
			limit: 1000,
        })
			.then((txInfo) => {
				let temp = {};
				for(const el of txInfo.data){
					if(isPrivateMessage(el)){
						temp[el.from] = el;
						if(el.from == getters.address){
							temp[el.data.list[0].to] = el;
						}
					}
				}
				//console.log(temp);
				commit('PING_CHAT_LIST', temp);
				return temp
			});
		
	},
	FETCH_CHAT: ({ commit },  params={page: 1, address: ''}) => {
		return getAddressTransactionList(params.address, {
            page: params.page || 1,
			limit: 50,
        })
            .then((txListInfo) => {
				let temp = {};
				temp[params.address] = txListInfo;
				//commit('PING_CHATS', temp);
                return txListInfo;
            });
	},
	FETCH_PING_UPDATE_TABLE: ({ commit }) => {
		commit('PING_UPDATE_TABLE');
	},
};
