const con = require("./mysqlConnection");
const bcrypt = require('bcrypt');

async function getUser(username) {
	let [[res], ] = await con.promise().execute(
		'select * from users where username=?',
		[username]
	);
	return res
}

async function getUserByID(id) {
	let [[res], ] = await con.promise().execute(
		'select * from users where userid=?',
		[id]
	);
	return res
}

async function createUser(username, password) {
	if(!username) {
		throw new Error("Please choose a username.");
	}

	if(username.length > 64){
		throw new Error("Username must be 64 characters or less.");
	}

	if(!password) {
		throw new Error("Please choose a password.");
	}

	if(password.length > 60){
		throw new Error("Password must be 60 characters or less.");
	}


	if( await getUser(username) ) {
		throw new Error("That username is already taken.");
	}

	password = await bcrypt.hash(password, 10);
	await con.promise().execute(
        'insert into users (username, password) values (?, ?);',
        [username, password]
    );
}

async function comparePassword(user, password){
  	return bcrypt.compare(password, user.password);
}

async function getInviteCode(code) {
	let [[res], ] = await con.promise().execute(
		'select * from invite_codes where code=?',
		[code]
	);
	return res
}

async function deleteInviteCode(code) {
	await con.promise().execute(
		'delete from invite_codes where code=?',
		[code]
	);
}

module.exports = {getUser, getUserByID, createUser, comparePassword, getInviteCode ,deleteInviteCode}