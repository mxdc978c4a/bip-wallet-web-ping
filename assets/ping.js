import crypto from 'crypto-browserify';
import {fromBase64} from "~/assets/utils";
import parseISO from "date-fns/esm/parseISO";
import {format} from "date-fns";
import formatDistance from "date-fns/formatDistance"
import {MINTERSCAN_API_URL} from "~/assets/variables";
import secp256k1 from 'secp256k1';


const sha1Salt = 'pingNet';

export const coinSymbol = 'PING';

export const postPrefix = '#po#,';
export const commentPrefix = '#co#,';
export const likePrefix = '#li#.';
export const pgpPrefix = '#pm#,';
export const pgpKeyPrefix = '#ke#,';

export const prefixLenght = 5;

export const mainAddress = generateMxBySha1('main');
export const pgpKeyAdress = generateMxBySha1('pgp');
export const likeAddress = generateMxBySha1('like');


export function getEcdh(privKeyBuffer, pubKeyBuffer){
	try{
		let pubKeyBufferFull = Buffer(65);
		pubKeyBufferFull[0] = 4;
		pubKeyBufferFull.set(Buffer.from(pubKeyBuffer, 'hex'), 1);
		//console.log('private', privKeyBuffer);
		//console.log('public', pubKeyBufferFull)
		//console.log('ecdh',secp256k1.ecdh(pubKeyBufferFull, privKeyBuffer))
		return secp256k1.ecdh(pubKeyBufferFull, privKeyBuffer).toString('hex');
	}catch{
		return null;
	}
}


export function encryptMessage(key, dataUft8){
	let cipher = crypto.createCipher('aes-192-cbc', key);
	let encrypted = cipher.update(dataUft8, 'utf8', 'Base64');
	encrypted += cipher.final('Base64');
	return encrypted;
}

export function decryptMessage(key, dataUft8){
	try{
		let decipher = crypto.createDecipher('aes-192-cbc', key);
		let decrypted = decipher.update(dataUft8, 'Base64', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	}catch{
		return null;
	}
}




function isString (value) {
	return typeof value === 'string' || value instanceof String;
}

export function getTimePart(timestamp){
	let date = parseISO(timestamp);
	return {time: format(date, 'HH:mm'), date: format(date, 'MMMM d')}
}

export function timeAgo(timestamp){
	const time = formatDistance(
		parseISO(timestamp), 
		new Date(), 
		{addSuffix: true,}
	);
	return time;
}



export function getMinterscanIconUrl(address) {
    return `${MINTERSCAN_API_URL}profiles/${address}/icon.jpg`;
}


export function encodeMx(a,b){
	if(!a || !b){
		return null;
	}
	if(isString(a)){
		a = parseInt(a)
	}
	if(isString(b)){
		b = parseInt(b)
	}
	if(a.toString().length > 13 || b.toString().length > 13){
		return null;
	}
	let ml = 40;
	a = a.toString(16);
	b = b.toString(16);
	let l = a.length + b.length;
	let dl = ml-l-2;
	let bl = b.length;
	if(bl<10){
		bl = '0'+bl.toString(10);
	}else{
		bl = bl.toString(10);
	}
	let mx = 'Mx'+bl+'0'.repeat(dl)+a+b;
	//console.log(12312, mx);
	return mx;
}

export function decodeMx(mx){
	try{
		if(!/Mx[0-9]{2}[0]{15,}[1-9a-zA-Z]\w+$/.test(mx)){
			return null
		}
		let ml = 40;
		mx = mx.substring(2,ml+2);
		let bl = parseInt(mx.substring(0,2));
		let b = mx.substring(ml-bl, ml);
		let a = mx.substring(3, ml-bl).match(/0{2}([1-9a-zA-Z]\w+)$/)[1];
		b = parseInt('0x'+b);
		a = parseInt('0x'+a);
		return {a: a, b: b};
	}
	catch{
		return null;
	}
}




export function generateMxBySha1(text) {
	return 'Mx'+crypto.createHash('sha1').update(text+sha1Salt).digest('hex');
};

export function generateHashtagMx(text) {
	return generateMxBySha1(text.toLowerCase());
};

export function generateCommentMx(block, txn){
	return encodeMx(block, txn);
	//return generateMxBySha1(block+'-'+txn);
}

export function isMinterAddress(minterAddress) {
	if (!minterAddress){
		return false;
	}
	if (minterAddress.length !== 42){
		return false;
	}
	if (!/^Mx[0-9abcdefABCDEF]*$/.test(minterAddress)){
		return false;
	}
	return true;
};



export function isLike(tx){
	if(!tx || !tx.payload || tx.type != 13 || !tx.data.list[1] || !decodeMx(tx.data.list[1].to)){
		return false
	}
	const message = fromBase64(tx.payload);
	if(getIsLikeRegExp().test(message)){
		return true;
	}
	return false;
}




export function isComment(tx){
	if(!tx || !tx.payload || !tx.data.list || tx.type != 13){
		return false
	}
	const message = fromBase64(tx.payload);
	const toAddr = tx.data.list[0].to;
	if(getIsCommentRegExp().test(message) && /Mx[0-9]{2}[0]{15,}[1-9a-zA-Z]\w+$/.test(toAddr)){
		return true;
	}
	return false;
}

export function isPost(tx){
	if(!tx || !tx.payload || tx.type != 13){
		return false
	}
	const message = fromBase64(tx.payload);
	if(getIsPostRegExp().test(message)){
		return true;
	}
	return false;
}
export function isPrivateMessage(tx){
	if(!tx || !tx.payload || tx.type != 13){
		return false;
	}
	const message = fromBase64(tx.payload);
	if(getIsPrivateRegExp().test(message)){
		return true;
	}
	return false;
}
export function isPgpKey(tx){
	if(!tx || !tx.payload || tx.type != 13){
		return false;
	}
	const message = fromBase64(tx.payload);
	if(getIsPgpKeyRegExp().test(message)){
		return true;
	}
	return false;
}




export function getIsPgpKeyRegExp(){
	return RegExp('^'+pgpKeyPrefix, "");
}

export function getIsCommentRegExp(){
	return RegExp('^'+commentPrefix, "");
}
export function getIsPostRegExp(){
	return RegExp('^'+postPrefix, "");
}
export function getIsLikeRegExp(){
	return RegExp('^'+likePrefix+'$', "");
}
export function getIsPrivateRegExp(){
	return RegExp('^'+pgpPrefix, "");
}




export function getPostPrefix(){
	return postPrefix;
}
export function getCommentPrefix(){
	return commentPrefix;
}
export function getPrefixLenght(){
	return prefixLenght;
}
