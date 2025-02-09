const map = L.map('map').setView([41.193, -0.366], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let localStream;
let peerConnections = {};
let username;
const socket = new WebSocket('wss://kylian.lemarois.caen.mds-project.fr:8080');

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        document.getElementById('localVideo').srcObject = stream;
    })
    .catch((error) => console.error('Erreur d\'accès aux périphériques média.', error));

socket.onopen = () => {
    console.log('Connecté au serveur WebSocket');
};

socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case "message":
                displayMessage(data);
                break;
            case "gps":
                updateGPSMarker(data);
                break;
            case "offer":
                handleOffer(data);
                break;
            case "answer":
                handleAnswer(data);
                break;
            case "candidate":
                handleCandidate(data);
                break;
            case "error":
                alert(`Erreur: ${data.message}`);
                break;
            default:
                console.log("Type de message inconnu:", data.type);
                break;
        }
    } catch (err) {
        console.error("Erreur lors de l'analyse du message:", err);
    }
};

socket.onclose = () => {
    console.log('Connexion WebSocket fermée');
};

function joinChat() {
    const usernameInput = document.getElementById('username');
    username = usernameInput.value.trim();

    if (username === "") {
        alert("Veuillez entrer votre nom d'utilisateur.");
        return;
    }
    const modal = document.getElementById('usernameModal');
    modal.style.display = 'none';
    const chatbox = document.getElementById('chatbox'); 
    const welcomeMessage = document.createElement('div');
    welcomeMessage.textContent = `Bienvenue, ${username}!`;
    chatbox.appendChild(welcomeMessage);
    chatbox.scrollTop = chatbox.scrollHeight;

    document.getElementById('centerMap').disabled = false;
    socket.send(JSON.stringify({ type: "connexion", data: username }));
    sendGPS();
    document.getElementById('send').disabled = false;
}

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.toggle('show');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        if (document.getElementById("usernameModal").style.display === "none") {
            sendMessage();
        } else {
            joinChat();
        }
    }
}

function sendGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(geoPosition => {
            const { latitude, longitude } = geoPosition.coords;
            const message = JSON.stringify({
                type: 'gps',
                latitude,   
                longitude,
                username
            });
            socket.send(message);
        }, error => {
            console.error('Error fetching GPS coordinates:', error);
        });
    } else {
        alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
}

function centerMap() {
    if (username && markers[username]) {
        const { lat, lng } = markers[username].getLatLng();
        map.setView([lat, lng], 13);
    } else {
        alert("Votre position n'est pas disponible sur la carte.");
    }
}

const markers = {};

function displayMessage(data) {
    const chatbox = document.getElementById('chatbox');
    const messageEl = document.createElement('div');
    messageEl.textContent = `${data.username}: ${data.message}`;
    chatbox.appendChild(messageEl);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function updateGPSMarker(data) {
    if (data.username && data.latitude && data.longitude) {
        if (markers[data.username]) {
            markers[data.username].setLatLng([data.latitude, data.longitude]);
        } else {
            const newMarker = L.marker([data.latitude, data.longitude], { draggable: true })
                .addTo(map)
                .bindPopup(`Utilisateur: ${data.username}<br><button onclick="startChat('${data.username}')">Démarrer le Chat</button>`);
            markers[data.username] = newMarker;
            map.setView([data.latitude, data.longitude], 13);
            newMarker.on('click', () => {
                newMarker.openPopup();
            });
        }
    } else {
        console.error("Données GPS invalides reçues:", data);
    }
}

function startChat(targetUsername) {
    if (targetUsername === username) {
        alert("Vous ne pouvez pas démarrer un chat avec vous-même.");
        return;
    }
    if (peerConnections[targetUsername]) {
        alert(`Vous êtes déjà en chat avec ${targetUsername}`);
        return;
    }

    if (markers[targetUsername]) {
        const { lat, lng } = markers[targetUsername].getLatLng();
        map.setView([lat, lng], 13);
    }

    createPeerConnection(targetUsername);
    createOffer(targetUsername);
}

function createPeerConnection(targetUsername) {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[targetUsername] = peerConnection;

    if (localStream) {
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });
    }

    const remoteStream = new MediaStream();
    peerConnection.ontrack = (event) => {
        remoteStream.addTrack(event.track);
        addRemoteVideo(targetUsername, remoteStream);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "candidate",
                candidate: event.candidate,
                target: targetUsername,
                sender: username
            }));
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed' || 
            peerConnection.connectionState === 'closed') {
            removeRemoteVideo(targetUsername);
            delete peerConnections[targetUsername];
        }
    };
}

async function createOffer(targetUsername) {
    const peerConnection = peerConnections[targetUsername];
    if (!peerConnection) {
        console.error(`PeerConnection pour ${targetUsername} non trouvé.`);
        return;
    }

    try {
        const offer = await peerConnection.createOffer();
        if (!offer || !offer.sdp) {
            console.error("Échec de la création de l'offre ou SDP invalide.");
            return;
        }
        await peerConnection.setLocalDescription(offer);

        socket.send(JSON.stringify({
            type: "offer",
            offer: offer,
            target: targetUsername,
            sender: username
        }));
    } catch (err) {
        console.error("Erreur lors de la création de l'offre:", err);
    }
}

async function handleOffer(data) {
    const senderUsername = data.sender;
    const offer = data.offer;

    if (!senderUsername || !offer) {
        console.error("Données de l'offre invalides reçues:", data);
        return;
    }

    if (!peerConnections[senderUsername]) {
        createPeerConnection(senderUsername);
    }

    const peerConnection = peerConnections[senderUsername];
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.send(JSON.stringify({
            type: "answer",
            answer: answer,
            target: senderUsername,
            sender: username
        }));
    } catch (err) {
        console.error("Erreur lors du traitement de l'offre:", err);
    }
}

async function handleAnswer(data) {
    const senderUsername = data.sender;
    const answer = data.answer;

    if (!senderUsername || !answer) {
        console.error("Données de la réponse invalides reçues:", data);
        return;
    }

    const peerConnection = peerConnections[senderUsername];
    if (!peerConnection) {
        console.error(`PeerConnection pour ${senderUsername} non trouvé.`);
        return;
    }

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
        console.error("Erreur lors de la définition de la description distante:", err);
    }
}

async function handleCandidate(data) {
    const senderUsername = data.sender;
    const candidate = data.candidate;

    if (!senderUsername || !candidate) {
        console.error("Données du candidat invalides reçues:", data);
        return;
    }

    const peerConnection = peerConnections[senderUsername];
    if (!peerConnection) {
        console.error(`PeerConnection pour ${senderUsername} non trouvé.`);
        return;
    }

    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.error("Erreur lors de l'ajout du candidat ICE reçu:", err);
    }
}

function addRemoteVideo(targetUsername, stream) {
    const marker = markers[targetUsername];
    if (!marker) return;

    const videoId = `remoteVideo_${targetUsername}`;
    const videoElement = `<video id="${videoId}" autoplay style="width: 300px; height: auto;"></video>`;

    const popupContent = `
        <div class="popup-content" style="width: 300px; height: auto;">
            <h3>Chat avec ${targetUsername}</h3>
            ${videoElement}
            <div class="popup-controls">
                <button onclick="endChat('${targetUsername}')">Terminer le Chat</button>
            </div>
        </div>
    `;

    marker.setPopupContent(popupContent);
    marker.openPopup();

    const remoteVideo = document.getElementById(videoId);
    if (remoteVideo) {
        remoteVideo.srcObject = stream;

        remoteVideo.onloadedmetadata = () => {
            const videoWidth = remoteVideo.videoWidth;
            const videoHeight = remoteVideo.videoHeight;

            const popup = marker.getPopup();
            if (popup) {
                popup.getElement().style.width = `${videoWidth}px`;
                popup.getElement().style.height = `${videoHeight + 50}px`;
            }
        };
    }
}

function removeRemoteVideo(targetUsername) {
    const marker = markers[targetUsername];
    if (!marker) return;

    const popupContent = `
        <div>
            <h3>Chat avec ${targetUsername}</h3>
            <p>Chat terminé.</p>
        </div>
    `;
    marker.setPopupContent(popupContent);
}

function endChat(targetUsername) {
    const peerConnection = peerConnections[targetUsername];
    if (peerConnection) {
        peerConnection.close();
        delete peerConnections[targetUsername];
    }
    removeRemoteVideo(targetUsername);
}

function sendMessage() {
    const message = document.getElementById('message').value.trim();
    if (message && username) {
        const messageObj = {
            username: username,
            message: message,
            type: "message"
        };
        socket.send(JSON.stringify(messageObj));
        document.getElementById('message').value = '';
    } else if (!username) {
        alert("Veuillez entrer un nom d'utilisateur avant d'envoyer un message.");
    }
}

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer.style.visibility === 'hidden') {
        chatContainer.style.visibility = 'visible';
        chatContainer.style.opacity = '1';
    } else {
        chatContainer.style.visibility = 'hidden';
        chatContainer.style.opacity = '0';
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

window.startChat = startChat;
window.endChat = endChat;
window.toggleChat = toggleChat;
window.handleKeyPress = handleKeyPress;
