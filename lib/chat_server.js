var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
	io = socketio.listen(server); //invoke listen function in socket io, passing http server along
	io.set('log level', 1);

	io.sockets.on('connection', function(socket){
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); //return guest number  (count?) and assign name
		joinRoom(socket, 'Lobby'); //lobby is default room
		handleMessageBroadcasting(socket, nickNames); //handle messages
		handleNameChangeAttempts(socket, nickNames, namesUsed); //handle name change
		handleRoomJoining(socket); //handle room joining
		socket.on('rooms', function() {
			socket.emit('rooms', io.sockets.manager.rooms); //provide user with list of occupied rooms when they ask "/rooms"
		});
		handleClientDisconnection(socket, nickNames, namesUsed);

	});
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

function joinRoom(socket, room) {
	socket.join(room)
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	sockt.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});
	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for(var i in usersInRoom) {
			var userSocketId = usersinRoom[i].id;
			if (userSocketId != socket.id) {
				if (i > 0) {
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text: usersInRoomSummary});
	}
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function(name){
		if (name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		} else {
			if(namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName)
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult', {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id].emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				}));
			} else {
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket) {
	socket.on('message', function(message){
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}