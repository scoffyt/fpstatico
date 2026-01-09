
import { NetworkMessage } from '../types';

// Usaremos a biblioteca PeerJS via CDN para evitar configurações complexas
// Você deve adicionar <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script> no seu index.html se preferir,
// mas aqui faremos via import dinâmico para facilitar.

class MultiplayerService {
  private peer: any;
  private connections: Map<string, any> = new Map();
  private myId: string = '';
  private onMessageCallbacks: ((msg: NetworkMessage) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    // Importa o PeerJS dinamicamente
    const PeerModule = await import('https://esm.sh/peerjs@1.5.2');
    const Peer = PeerModule.default;

    // O ID será gerado aleatoriamente ou você pode usar o nick
    this.myId = 'fs-' + Math.random().toString(36).substring(2, 9);
    this.peer = new Peer(this.myId);

    this.peer.on('open', (id: string) => {
      console.log('Meu ID no servidor global:', id);
      // Aqui poderíamos enviar o ID para um lobby central, 
      // mas para simplificar, usaremos o sistema de "conectar por ID"
    });

    // Quando alguém se conecta a mim
    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });
  }

  private setupConnection(conn: any) {
    conn.on('data', (data: NetworkMessage) => {
      this.onMessageCallbacks.forEach(cb => cb(data));
    });

    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
    });
  }

  getMyId() { return this.myId; }

  // No sistema WebRTC, precisamos saber o ID do outro jogador para conectar
  // Para um jogo real, você usaria um banco de dados simples (como Supabase ou Firebase)
  // para listar os IDs ativos. Para este exemplo, ele tenta conectar a IDs próximos.
  connectToPeer(remoteId: string) {
    if (!this.peer || this.connections.has(remoteId)) return;
    const conn = this.peer.connect(remoteId);
    this.setupConnection(conn);
  }

  broadcast(type: NetworkMessage['type'], payload: any) {
    const msg: NetworkMessage = {
      type,
      payload,
      senderId: this.myId
    };

    // Envia para todos os jogadores conectados
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }

  onMessage(callback: (msg: NetworkMessage) => void) {
    this.onMessageCallbacks.push(callback);
  }

  disconnect() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) this.peer.destroy();
  }
}

export const multiplayerService = new MultiplayerService();
