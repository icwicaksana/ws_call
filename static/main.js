// Variabel global
let socket = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isConnected = false;
let isInCall = false;
let isEndingCall = false;  // Flag to prevent infinite loop
let iceCandidateQueue = [];
let lastOffer = null;
let visualizerInterval = null;

// Konfigurasi ICE servers
const iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

// Elemen DOM
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const callControls = document.getElementById('callControls');
const startCallBtn = document.getElementById('startCallBtn');
const answerCallBtn = document.getElementById('answerCallBtn');
const endCallBtn = document.getElementById('endCallBtn');
const localAudio = document.getElementById('localAudio');
const remoteAudio = document.getElementById('remoteAudio');
const logEntries = document.getElementById('logEntries');
const usernameInput = document.getElementById('username');
const toastContainer = document.getElementById('toastContainer');
const visualizer = document.getElementById('visualizer');
const logHeader = document.getElementById('logHeader');
const logContent = document.getElementById('logContent');
const logToggle = document.getElementById('logToggle');
const audioSection = document.getElementById('audioSection');
const audioToggle = document.getElementById('audioToggle');

// Generate visualizer bars
function initVisualizer() {
    visualizer.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = '5px';
        visualizer.appendChild(bar);
    }
}

// Animate visualizer
function startVisualizer() {
    visualizer.classList.add('active');
    const bars = visualizer.querySelectorAll('.bar');
    visualizerInterval = setInterval(() => {
        bars.forEach(bar => {
            const height = Math.random() * 40 + 5;
            bar.style.height = `${height}px`;
        });
    }, 100);
}

function stopVisualizer() {
    visualizer.classList.remove('active');
    if (visualizerInterval) {
        clearInterval(visualizerInterval);
        visualizerInterval = null;
    }
    const bars = visualizer.querySelectorAll('.bar');
    bars.forEach(bar => {
        bar.style.height = '5px';
    });
}

// Toast notification system
function showToast(title, message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${iconMap[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// Toggle log section
logHeader.addEventListener('click', () => {
    logContent.classList.toggle('collapsed');
    logToggle.classList.toggle('collapsed');
});

// Toggle audio section
audioToggle.addEventListener('click', () => {
    audioSection.classList.toggle('collapsed');
});

// Fungsi untuk menambahkan log
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
        <span class="log-time">[${timestamp}]</span>
        <span class="log-message">${message}</span>
    `;
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
}

// Fungsi untuk mengupdate status
function updateStatus(status, className) {
    statusText.textContent = status;
    statusBadge.className = `status-badge ${className}`;
}

// Fungsi untuk menghubungkan ke server WebSocket
async function connect() {
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/ws`;
        addLog(`Menghubungkan ke server...`);
        
        connectBtn.disabled = true;
        connectBtn.innerHTML = '<span class="spinner"></span><span>Menghubungkan...</span>';
        
        socket = new WebSocket(wsUrl);
        
        socket.onopen = function(event) {
            isConnected = true;
            updateStatus('Terhubung ke Server', 'connected');
            
            connectBtn.classList.add('hidden');
            disconnectBtn.classList.remove('hidden');
            callControls.classList.add('visible');
            
            addLog('Berhasil terhubung ke server', 'success');
            showToast('Terhubung', 'Berhasil terhubung ke server signaling', 'success');
            
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>Hubungkan</span>';
        };

        socket.onmessage = async function(event) {
            const data = JSON.parse(event.data);
            addLog(`Menerima: ${data.type}`);
            await handleSignalingMessage(data);
        };

        socket.onclose = function(event) {
            isConnected = false;
            updateStatus('Tidak Terhubung', 'disconnected');
            
            connectBtn.classList.remove('hidden');
            disconnectBtn.classList.add('hidden');
            callControls.classList.remove('visible');
            
            addLog('Koneksi terputus', 'warning');
            showToast('Terputus', 'Koneksi ke server terputus', 'warning');
            
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>Hubungkan</span>';
            
            if (isInCall) {
                endCall();
            }
        };

        socket.onerror = function(error) {
            addLog('Error WebSocket', 'error');
            updateStatus('Error Koneksi', 'disconnected');
            showToast('Error', 'Terjadi kesalahan koneksi', 'error');
            
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>Hubungkan</span>';
        };

    } catch (error) {
        addLog(`Gagal menghubungkan: ${error.message}`, 'error');
        updateStatus('Gagal Terhubung', 'disconnected');
        showToast('Gagal', error.message, 'error');
        
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>Hubungkan</span>';
    }
}

// Fungsi untuk memutuskan koneksi
function disconnect() {
    if (socket) {
        socket.close();
    }
    if (isInCall) {
        endCall();
    }
}

// Fungsi untuk menangani pesan signaling
async function handleSignalingMessage(data) {
    switch (data.type) {
        case 'offer':
            await handleOffer(data);
            break;
        case 'answer':
            await handleAnswer(data);
            break;
        case 'ice-candidate':
            await handleIceCandidate(data);
            break;
        case 'call-ended':
            handleCallEnded();
            break;
        default:
            addLog(`Pesan tidak dikenal: ${data.type}`, 'warning');
    }
}

// Fungsi untuk membuat dan mengkonfigurasi PeerConnection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(iceConfig);

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            sendSignalingMessage({
                type: 'ice-candidate',
                candidate: event.candidate,
                from: usernameInput.value
            });
        }
    };

    peerConnection.ontrack = event => {
        addLog('Menerima stream remote', 'success');
        if (remoteAudio.srcObject !== event.streams[0]) {
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch(e => addLog(`Gagal memutar audio: ${e}`, 'error'));
        }
    };

    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        addLog(`Status koneksi: ${state}`);
        
        if (state === 'connected' || state === 'completed') {
            updateStatus('Dalam Panggilan', 'in-call');
            startCallBtn.classList.add('hidden');
            answerCallBtn.classList.add('hidden');
            endCallBtn.classList.remove('hidden');
            startVisualizer();
            showToast('Panggilan Terhubung', 'Anda terhubung dengan lawan bicara', 'success');
        } else if (state === 'failed') {
            addLog('Koneksi gagal', 'error');
            updateStatus('Koneksi Gagal', 'disconnected');
            showToast('Koneksi Gagal', 'Coba hubungkan kembali', 'error');
            endCall();
        }
    };
}

// Check if WebRTC is available (requires HTTPS or localhost)
function checkWebRTCAvailable() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isHttps = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (!isHttps && !isLocalhost) {
            return {
                available: false,
                message: 'WebRTC memerlukan koneksi HTTPS. Silakan akses aplikasi menggunakan https://'
            };
        }
        return {
            available: false,
            message: 'Browser tidak mendukung WebRTC atau izin media ditolak'
        };
    }
    return { available: true, message: '' };
}

// Fungsi untuk memulai panggilan
async function startCall() {
    if (isInCall) {
        showToast('Peringatan', 'Anda sedang dalam panggilan', 'warning');
        return;
    }
    
    // Check WebRTC availability
    const webrtcCheck = checkWebRTCAvailable();
    if (!webrtcCheck.available) {
        addLog(`Error: ${webrtcCheck.message}`, 'error');
        showToast('WebRTC Tidak Tersedia', webrtcCheck.message, 'error');
        return;
    }
    
    isInCall = true;

    try {
        addLog('Memulai panggilan...');
        updateStatus('Memanggil...', 'calling');
        
        startCallBtn.disabled = true;
        startCallBtn.innerHTML = '<span class="spinner"></span><span>Menghubungkan...</span>';
        
        createPeerConnection();

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        localAudio.srcObject = localStream;
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        sendSignalingMessage({ type: 'offer', offer: offer, from: usernameInput.value });
        addLog('Offer dikirim', 'success');
        
        startCallBtn.disabled = false;
        startCallBtn.innerHTML = '<i class="fas fa-phone"></i><span>Mulai Panggilan</span>';
        
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
        showToast('Gagal', error.message, 'error');
        endCall();
    }
}

// Handle incoming offer
async function handleOffer(data) {
    if (isInCall) {
        addLog(`Panggilan dari ${data.from} diabaikan`, 'warning');
        return;
    }
    
    addLog(`Panggilan masuk dari ${data.from}`, 'info');
    updateStatus(`Panggilan dari ${data.from}`, 'calling');
    showToast('Panggilan Masuk', `${data.from} menelepon Anda`, 'info');
    
    lastOffer = data.offer;
    
    startCallBtn.classList.add('hidden');
    answerCallBtn.classList.remove('hidden');
}

// Answer call
async function answerCall() {
    if (!lastOffer) {
        showToast('Error', 'Tidak ada panggilan untuk dijawab', 'error');
        return;
    }
    
    // Check WebRTC availability
    const webrtcCheck = checkWebRTCAvailable();
    if (!webrtcCheck.available) {
        addLog(`Error: ${webrtcCheck.message}`, 'error');
        showToast('WebRTC Tidak Tersedia', webrtcCheck.message, 'error');
        return;
    }
    
    isInCall = true;

    try {
        addLog('Menjawab panggilan...');
        updateStatus('Menjawab...', 'calling');
        
        answerCallBtn.disabled = true;
        answerCallBtn.innerHTML = '<span class="spinner"></span><span>Menghubungkan...</span>';
        
        createPeerConnection();

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        localAudio.srcObject = localStream;

        await peerConnection.setRemoteDescription(lastOffer);
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        sendSignalingMessage({ type: 'answer', answer: answer, from: usernameInput.value });
        addLog('Answer dikirim', 'success');
        
        answerCallBtn.classList.add('hidden');
        
    } catch (error) {
        addLog(`Gagal menjawab: ${error.message}`, 'error');
        showToast('Gagal', error.message, 'error');
        endCall();
    }
}

// Handle answer
async function handleAnswer(data) {
    try {
        if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
            addLog(`Answer diterima dari ${data.from}`, 'success');
            await peerConnection.setRemoteDescription(data.answer);
        }
    } catch (error) {
        addLog(`Error handle answer: ${error.message}`, 'error');
    }
}

// Handle ICE candidate
async function handleIceCandidate(data) {
    try {
        if (peerConnection && peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(data.candidate);
            addLog('ICE candidate ditambahkan');
        } else {
            iceCandidateQueue.push(data.candidate);
            addLog('ICE candidate diantrikan');
        }
    } catch (error) {
        addLog(`Error ICE: ${error.message}`, 'error');
    }
}

// End call
function endCall() {
    // Prevent re-entry and infinite loop
    if (isEndingCall) {
        return;
    }
    isEndingCall = true;
    
    addLog('Mengakhiri panggilan...');
    stopVisualizer();
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    localAudio.srcObject = null;
    remoteAudio.srcObject = null;
    
    startCallBtn.classList.remove('hidden');
    startCallBtn.disabled = false;
    startCallBtn.innerHTML = '<i class="fas fa-phone"></i><span>Mulai Panggilan</span>';
    
    answerCallBtn.classList.add('hidden');
    answerCallBtn.disabled = false;
    answerCallBtn.innerHTML = '<i class="fas fa-phone-volume"></i><span>Jawab Panggilan</span>';
    
    endCallBtn.classList.add('hidden');
    
    if (isConnected) {
        updateStatus('Terhubung ke Server', 'connected');
    } else {
        updateStatus('Tidak Terhubung', 'disconnected');
    }
    
    const wasInCall = isInCall;
    isInCall = false;
    lastOffer = null;
    
    // Only send call-ended if we were actually in a call (not already ending)
    if (wasInCall && socket && socket.readyState === WebSocket.OPEN) {
        sendSignalingMessage({
            type: 'call-ended',
            from: usernameInput.value
        });
    }
    
    showToast('Panggilan Berakhir', 'Panggilan telah diakhiri', 'info');
    
    // Reset flag after a short delay
    setTimeout(() => {
        isEndingCall = false;
    }, 500);
}

// Handle call ended from peer
function handleCallEnded() {
    // Don't process if we're already ending the call
    if (isEndingCall) {
        return;
    }
    addLog('Panggilan diakhiri oleh peer', 'warning');
    showToast('Panggilan Berakhir', 'Lawan bicara mengakhiri panggilan', 'warning');
    endCall();
}

// Send signaling message
function sendSignalingMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        addLog('Socket tidak terhubung', 'error');
    }
}

// Prevent accidental refresh during call
window.addEventListener('beforeunload', function(e) {
    if (isInCall) {
        e.preventDefault();
        e.returnValue = 'Anda sedang dalam panggilan. Yakin ingin meninggalkan?';
        return e.returnValue;
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Generate random username
    const defaultName = 'User' + Math.floor(Math.random() * 1000);
    usernameInput.value = defaultName;
    
    // Initialize visualizer
    initVisualizer();
    
    // Initial log
    addLog('Aplikasi siap digunakan', 'success');
    updateStatus('Siap Terhubung', 'disconnected');
    
    // Event listeners
    connectBtn.addEventListener('click', connect);
    disconnectBtn.addEventListener('click', disconnect);
    startCallBtn.addEventListener('click', startCall);
    answerCallBtn.addEventListener('click', answerCall);
    endCallBtn.addEventListener('click', endCall);
    
    // Welcome toast
    setTimeout(() => {
        showToast('Selamat Datang', `Halo ${defaultName}! Hubungkan ke server untuk mulai.`, 'info', 5000);
    }, 500);
});
