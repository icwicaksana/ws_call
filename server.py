import asyncio
import json
import logging
from aiohttp import web, WSMsgType
import aiofiles
import os
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set untuk menyimpan client yang terhubung
connected_clients = set()

class WebsocketServer:
    def __init__(self):
        self.connected_clients = set()
        
    async def websocket_handler(self, request):
        """Handler WebSocket menggunakan aiohttp"""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        self.connected_clients.add(ws)
        logger.info(f"Client baru terhubung: {request.remote}. Total: {len(self.connected_clients)}")

        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        logger.info(f"Menerima pesan dari {request.remote}: {data.get('type', 'unknown')}")
                        
                        # Relay pesan ke semua client lain
                        for client in self.connected_clients:
                            if client != ws and not client.closed:
                                try:
                                    await client.send_str(json.dumps(data))
                                except Exception as e:
                                    logger.error(f"Error saat relay ke client: {e}")
                    except json.JSONDecodeError:
                        logger.error(f"Pesan JSON tidak valid dari {request.remote}")
                    except Exception as e:
                        logger.error(f"Error memproses pesan dari {request.remote}: {e}")

                elif msg.type == WSMsgType.ERROR:
                    logger.error(f'Koneksi WS ditutup dengan error {ws.exception()}')
        
        except Exception as e:
            logger.error(f"Error pada koneksi WebSocket {request.remote}: {e}")
            
        finally:
            self.connected_clients.discard(ws)
            logger.info(f"Client {request.remote} terputus. Total: {len(self.connected_clients)}")

        return ws

    async def serve_static(self, request):
        """Handler untuk file static"""
        filename = request.match_info.get('filename', '')
        static_path = Path(__file__).parent / 'static' / filename
        
        if not static_path.exists():
            return web.Response(status=404, text="File tidak ditemukan")
            
        try:
            async with aiofiles.open(static_path, 'rb') as f:
                content = await f.read()
                
            # Tentukan content type berdasarkan ekstensi file
            content_type = 'text/plain'
            if filename.endswith('.js'):
                content_type = 'application/javascript'
            elif filename.endswith('.css'):
                content_type = 'text/css'
            elif filename.endswith('.html'):
                content_type = 'text/html'
                
            return web.Response(body=content, content_type=content_type)
        except Exception as e:
            logger.error(f"Error serving static file {filename}: {e}")
            return web.Response(status=500, text="Error internal server")

    async def serve_index(self, request):
        """Handler untuk halaman utama"""
        index_path = Path(__file__).parent / 'templates' / 'index.html'
        
        if not index_path.exists():
            return web.Response(status=404, text="Halaman tidak ditemukan")
            
        try:
            async with aiofiles.open(index_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            return web.Response(text=content, content_type='text/html')
        except Exception as e:
            logger.error(f"Error serving index page: {e}")
            return web.Response(status=500, text="Error internal server")

    async def handle_favicon(self, request):
        """Handler untuk mengabaikan permintaan favicon"""
        return web.Response(status=204)

    async def run(self):
        """Memulai server"""
        logger.info("Memulai Websocket Server...")
        app = web.Application()
        
        # Tambahkan semua route ke aplikasi
        app.router.add_get('/', self.serve_index)
        app.router.add_get('/index.html', self.serve_index)
        app.router.add_get('/favicon.ico', self.handle_favicon)
        app.router.add_get('/static/{filename}', self.serve_static)
        app.router.add_get('/ws', self.websocket_handler) # Route baru untuk WebSocket

        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', 8080)
        await site.start()
        
        logger.info("Server berjalan di http://0.0.0.0:8080")
        logger.info("Gunakan Ctrl+C untuk berhenti.")
        
        # Keep server running
        await asyncio.Event().wait()


if __name__ == "__main__":
    server = WebsocketServer()
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        logger.info("Aplikasi ditutup")