const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const path = require('path');
const app = express();

app.use(express.static('public'));

// 💾 SISTEMA DE PERSISTENCIA (Adaptado para Render Disk)
const dbDirectory = process.env.RENDER ? '/var/data' : __dirname;
const dbPath = path.resolve(dbDirectory, 'betflix_mexico_v1.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir la base de datos persistente", err.message);
    } else {
        console.log("💾 Base de datos conectada correctamente en:", dbPath);
    }
});

const dbGet = (query, params = []) => new Promise((resolve, reject) => db.get(query, params, (err, row) => err ? reject(err) : resolve(row)));
const dbAll = (query, params = []) => new Promise((resolve, reject) => db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows)));
const dbRun = (query, params = []) => new Promise((resolve, reject) => db.run(query, params, function(err) { err ? reject(err) : resolve(this) }));

const CUENTAS_GMAIL_MAP = {
    'darciogarces@gmail.com': 'wkcidkcgtuapcnkh'
};

const PLATAFORMAS = {
    'netflix': { nombre: 'Netflix', color: '#E50914', alpha: 'rgba(229, 9, 20, 0.15)', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', keyword_from: 'netflix' },
    'disney': { nombre: 'Disney+', color: '#ffffff', alpha: 'rgba(255, 255, 255, 0.1)', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', keyword_from: 'disneyplus' }
};

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'betflix_mexico_ultra_secure_2026_MX',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT UNIQUE, pass TEXT, rol TEXT, creado_por INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS correos (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, user_id INTEGER, fecha_asignacion DATETIME DEFAULT (date('now', 'localtime')))");
    db.run("CREATE TABLE IF NOT EXISTS registro_codigos (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, email_buscado TEXT, fecha DATETIME DEFAULT (datetime('now', 'localtime')))");
    
    db.run("INSERT OR IGNORE INTO usuarios (user, pass, rol, creado_por) VALUES ('dueño', 'teamo2020', 'Administrador', NULL)");
});

// 🎬 ESTILO CINEMATOGRÁFICO Y ELEGANTE (TEMA NETFLIX)
const CSS_MODERNO = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    :root {
        --text-main: #f8fafc;
        --text-muted: #a3a3a3;
        --card-bg: rgba(10, 10, 10, 0.75);
        --card-border: rgba(229, 9, 20, 0.15);
        --accent: #E50914;
        --accent-hover: #b80710;
        --btn-bg: rgba(229, 9, 20, 0.1);
        --btn-hover: rgba(229, 9, 20, 0.3);
        --shadow-elegant: 0 10px 40px rgba(0, 0, 0, 0.8);
        --blur-effect: blur(20px);
        --radius: 16px;
    }

    body { 
        background: url('https://images.unsplash.com/photo-1604147706283-d7119b5b822c?q=80&w=2000&auto=format&fit=crop') center/cover fixed;
        background-color: #000000;
        color: var(--text-main); 
        font-family: 'Inter', sans-serif; 
        margin: 0; padding: 0; box-sizing: border-box; overflow-x: hidden; 
        min-height: 100vh;
    }

    body::before {
        content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle at top center, rgba(229, 9, 20, 0.25) 0%, rgba(0, 0, 0, 0.95) 80%);
        z-index: -1; pointer-events: none;
    }

    .goog-te-banner-frame.skiptranslate, #goog-gt-tt, .goog-te-gadget-tooltip { display: none !important; }
    body { top: 0px !important; }

    .top-header { 
        background: transparent; 
        padding: 25px 40px; 
        display: flex; justify-content: space-between; align-items: center; 
    }
    
    .user-pill {
        display: flex; align-items: center; gap: 12px;
        background: var(--card-bg); padding: 8px 16px; 
        border: 1px solid var(--card-border); backdrop-filter: var(--blur-effect);
        border-radius: 50px; box-shadow: var(--shadow-elegant);
        font-size: 13px; cursor: pointer; transition: 0.3s;
    }
    .user-pill:hover { background: var(--btn-hover); border-color: rgba(229, 9, 20, 0.4); }
    .user-pill img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
    .user-pill .info { display: flex; flex-direction: column; }
    .user-pill .info strong { color: var(--text-main); font-weight: 600; letter-spacing: 0.5px; }
    .user-pill .info span { color: var(--text-muted); font-size: 11px; }

    .brand-logo { font-size: 20px; font-weight: 300; display:flex; align-items:center; gap: 10px; letter-spacing: 2px; text-transform: uppercase; color: #fff;}
    .brand-logo strong { font-weight: 700; color: #E50914; }

    .search-top { display: flex; align-items: center; gap: 15px; }
    .search-top input {
        background: var(--card-bg); border: 1px solid var(--card-border); padding: 12px 25px; width: 280px;
        border-radius: 50px; box-shadow: var(--shadow-elegant); color: #fff; backdrop-filter: var(--blur-effect);
        font-family: 'Inter', sans-serif; font-size: 13px; outline: none; transition: 0.3s;
    }
    .search-top input:focus { border-color: #E50914; width: 320px; }

    .dashboard-grid { 
        display: grid; grid-template-columns: 380px 1fr 300px; gap: 30px; 
        padding: 10px 40px 40px 40px; align-items: start;
    }

    .platforms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .plat-card {
        background: var(--card-bg); border-radius: var(--radius); padding: 25px 20px;
        box-shadow: var(--shadow-elegant); display: flex; flex-direction: column; gap: 15px;
        position: relative; overflow: hidden; border: 1px solid var(--card-border);
        backdrop-filter: var(--blur-effect); transition: 0.3s;
    }
    .plat-card:hover { transform: translateY(-3px); border-color: #E50914; box-shadow: 0 10px 30px rgba(229, 9, 20, 0.15); }
    
    .plat-header { display: flex; justify-content: space-between; align-items: flex-start; z-index: 2; position: relative; }
    .plat-logo { height: 24px; max-width: 90px; object-fit: contain; opacity: 0.9; }
    .main-card-logo { height: 35px; max-width: 130px; object-fit: contain; }

    .status-ok { background: rgba(229, 9, 20, 0.15); border: 1px solid rgba(229, 9, 20, 0.3); color: #ffebec; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 50px; letter-spacing: 0.5px; }
    
    .plat-stats { z-index: 2; position: relative; margin-top: 15px; }
    .plat-stats span { display: block; font-size: 12px; font-weight: 400; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;}
    .plat-stats .line { height: 1px; width: 100%; margin-bottom: 12px; background: rgba(255,255,255,0.1); }
    
    .plat-actions { display: flex; flex-direction: column; gap: 10px; z-index: 2; position: relative; margin-top: auto; }
    .btn-action-sm { background: var(--btn-bg); color: var(--text-main); border: 1px solid var(--card-border); padding: 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.3s; text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-action-sm:hover { background: var(--btn-hover); border-color: #E50914; }

    .center-panel { display: flex; flex-direction: column; gap: 25px; }
    .main-card {
        background: var(--card-bg); border-radius: var(--radius); padding: 40px;
        box-shadow: var(--shadow-elegant); display: none; animation: fadeIn 0.4s ease;
        border: 1px solid var(--card-border); backdrop-filter: var(--blur-effect);
    }
    .main-card.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

    .main-card-header { display: flex; align-items: center; gap: 25px; margin-bottom: 35px; }
    .main-card-title h3 { margin: 0; font-size: 24px; color: var(--text-main); font-weight: 500; letter-spacing: -0.5px; }
    .main-card-title p { margin: 6px 0 0 0; color: var(--text-muted); font-size: 13px; font-weight: 300; }

    .action-row { display: flex; gap: 15px; margin-bottom: 25px; }
    .action-btn-pill {
        flex: 1; background: var(--btn-bg); border: 1px solid var(--card-border);
        padding: 16px; border-radius: 50px; font-size: 11px; font-weight: 600;
        color: var(--text-main); cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;
        transition: 0.3s; text-transform: uppercase; letter-spacing: 1px;
    }
    .action-btn-pill:hover { background: rgba(229, 9, 20, 0.2); border-color: #E50914; transform: translateY(-2px); }

    .search-input-large {
        width: 100%; background: rgba(0,0,0,0.6); border: 1px solid rgba(229, 9, 20, 0.3); 
        padding: 20px 30px; border-radius: 50px; font-size: 14px;
        color: var(--text-main); outline: none; box-sizing: border-box; font-family: 'Inter', sans-serif;
        transition: 0.3s; backdrop-filter: blur(10px);
    }
    .search-input-large:focus { border-color: #E50914; background: rgba(0,0,0,0.8); }

    .iframe-container {
        background: var(--card-bg); border-radius: var(--radius); 
        box-shadow: var(--shadow-elegant); overflow: hidden; border: 1px solid var(--card-border);
        height: 500px; display: flex; flex-direction: column; backdrop-filter: var(--blur-effect);
    }
    .iframe-header {
        padding: 16px 25px; background: rgba(0,0,0,0.5); 
        border-bottom: 1px solid var(--card-border); font-weight: 500; 
        font-size: 12px; color: #E50914; text-transform: uppercase; letter-spacing: 1px;
    }

    .right-sidebar { display: flex; flex-direction: column; gap: 25px; }
    .side-card {
        background: var(--card-bg); border-radius: var(--radius); padding: 25px;
        box-shadow: var(--shadow-elegant); border: 1px solid var(--card-border); backdrop-filter: var(--blur-effect);
    }
    .side-card h4 { margin: 0 0 20px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--card-border); padding-bottom: 12px;}
    
    .activity-list { display: flex; flex-direction: column; gap: 15px; }
    .activity-item { border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; }
    .activity-item:last-child { border-bottom: none; padding-bottom: 0; }
    .activity-item strong { display: block; font-size: 13px; color: var(--text-main); font-weight: 500; }
    .activity-item span { font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;}

    .menu-list { display: flex; flex-direction: column; gap: 10px; }
    .menu-btn-item {
        background: transparent; border: 1px solid transparent; padding: 12px 16px;
        border-radius: 8px; font-size: 13px; font-weight: 400;
        color: var(--text-main); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 12px;
        transition: 0.3s; font-family: 'Inter', sans-serif;
    }
    .menu-btn-item:hover { background: rgba(229, 9, 20, 0.1); border-color: rgba(229, 9, 20, 0.3); transform: translateX(5px); }

    .input-classic { width: 100%; padding: 16px; margin-bottom: 15px; border-radius: 8px; border: 1px solid var(--card-border); background: rgba(0,0,0,0.5); color: white; font-family: 'Inter', sans-serif; box-sizing: border-box; transition: 0.3s; outline: none;}
    .input-classic:focus { border-color: #E50914; }
    select.input-classic option { background: #0a0a0a; color: #fff; }
    
    .btn-submit { background: #E50914; color: #fff; border: none; padding: 16px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;}
    .btn-submit:hover { background: #b80710; box-shadow: 0 0 15px rgba(229, 9, 20, 0.4); }

    table { width: 100%; border-collapse: separate; border-spacing: 0; }
    table thead th { background: rgba(0,0,0,0.5) !important; border-bottom: 1px solid var(--card-border); padding: 16px; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: var(--text-muted); }
    table tr td { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 16px; font-size: 13px; color: var(--text-main); }
    table tr:last-child td { border-bottom: none; }
</style>

<script>
    function openTab(tabId) {
        document.querySelectorAll('.main-card').forEach(p => p.classList.remove('active'));
        let selectedTab = document.getElementById(tabId);
        if(selectedTab) selectedTab.classList.add('active');
        localStorage.setItem('activeBetflixTab', tabId);
    }
    document.addEventListener('DOMContentLoaded', () => {
        let active = localStorage.getItem('activeBetflixTab');
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.has('buscar_dueno')) { active = 'panel-base-datos'; }
        if(!active || !document.getElementById(active)) active = 'panel-netflix'; 
        openTab(active);
    });
</script>
`;

app.use(async (req, res, next) => {
    const rutasAbiertas = ['/', '/login', '/logout'];
    if (rutasAbiertas.includes(req.path)) return next();
    if (req.session && req.session.uid) {
        try {
            const row = await dbGet("SELECT id FROM usuarios WHERE id = ?", [req.session.uid]);
            if (!row) {
                req.session.destroy();
                return res.send("<script>alert('⛔ ACCESO DENEGADO'); window.location='/';</script>");
            }
            next();
        } catch (err) { return res.redirect('/'); }
    } else { return res.redirect('/'); }
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acceso - stremin gunpreetsel</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: url('https://images.unsplash.com/photo-1604147706283-d7119b5b822c?q=80&w=2000&auto=format&fit=crop') center/cover fixed; background-color: #000000; height: 100vh; display: flex; justify-content: center; align-items: center; }
            body::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at top center, rgba(229, 9, 20, 0.35) 0%, rgba(0, 0, 0, 0.95) 80%); z-index: 1; pointer-events: none; }
            
            .login-box { position: relative; z-index: 2; background: rgba(10, 10, 10, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(229, 9, 20, 0.3); border-radius: 16px; padding: 50px 40px; width: 100%; max-width: 400px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8); box-sizing: border-box; text-align: center; }
            .login-box h2 { color: #ffffff; font-size: 24px; font-weight: 400; letter-spacing: 2px; margin-top: 0; margin-bottom: 35px; text-transform: uppercase; }
            
            .input-group { margin-bottom: 20px; }
            .input-group input { width: 100%; background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 255, 255, 0.15); color: #ffffff; height: 55px; padding: 0 20px; box-sizing: border-box; font-size: 14px; border-radius: 8px; outline: none; transition: 0.3s; }
            .input-group input:focus { border-color: #E50914; background: rgba(0,0,0,0.9); }
            
            .btn-submit { width: 100%; background: #E50914; color: #ffffff; font-size: 13px; font-weight: 600; padding: 18px; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px; transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; }
            .btn-submit:hover { background: #b80710; box-shadow: 0 0 15px rgba(229, 9, 20, 0.5); }
            
            .help-text { color: #888; font-size: 12px; margin-top: 30px; line-height: 1.6; font-weight: 300; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Acceso Seguro</h2>
            <form action="/login" method="POST">
                <div class="input-group">
                    <input type="text" name="user" placeholder="Usuario" required>
                </div>
                <div class="input-group">
                    <input type="password" name="pass" placeholder="Contraseña" required>
                </div>
                <button type="submit" class="btn-submit">Ingresar</button>
            </form>
            <div class="help-text">Panel de administración encriptado. Conexión segura.</div>
        </div>
    </body>
    </html>
    `);
});

app.post('/login', async (req, res) => {
    const { user, pass } = req.body;
    try {
        const row = await dbGet("SELECT * FROM usuarios WHERE user = ? AND pass = ?", [user, pass]);
        if (row) {
            req.session.uid = row.id; req.session.user = row.user; req.session.rol = row.rol;
            res.redirect('/dash');
        } else { res.send("<script>alert('⛔ Datos incorrectos.'); window.location='/';</script>"); }
    } catch (err) { res.redirect('/'); }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/dash', async (req, res) => {
    const esAdminPrincipal = (req.session.user === 'dueño' || req.session.user === 'ruben');
    const esSubAdmin = (req.session.rol === 'Subadministrador');

    if (esAdminPrincipal || esSubAdmin || req.session.rol === 'Cliente') {
        try {
            let query = esAdminPrincipal ? "SELECT * FROM usuarios" : "SELECT * FROM usuarios WHERE creado_por = ? OR id = ?";
            let params = esAdminPrincipal ? [] : [req.session.uid, req.session.uid];
            const usuarios = await dbAll(query, params);
            const correos = await dbAll("SELECT * FROM correos", []);
            const registros = await dbAll("SELECT * FROM registro_codigos ORDER BY id DESC LIMIT 5", []);

            let plataformasCardsHtml = "";
            Object.keys(PLATAFORMAS).forEach(key => {
                let plat = PLATAFORMAS[key];
                plataformasCardsHtml += `
                <div class="plat-card">
                    <div style="position:absolute; top:-50px; right:-50px; width:150px; height:150px; background:radial-gradient(circle, ${plat.alpha} 0%, transparent 70%); border-radius:50%; pointer-events:none;"></div>
                    <div class="plat-header">
                        <img src="${plat.logo}" alt="${plat.nombre}" class="plat-logo">
                        <span class="status-ok">OPERATIVO</span>
                    </div>
                    <div class="plat-stats">
                        <span>Estado</span>
                        <div class="line"></div>
                    </div>
                    <div class="plat-actions">
                        <button class="btn-action-sm" onclick="openTab('panel-${key}')">Consultar Plataforma</button>
                    </div>
                </div>`;
            });

            plataformasCardsHtml += `
            <div class="plat-card">
                <div style="position:absolute; top:-50px; right:-50px; width:150px; height:150px; background:radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%); border-radius:50%; pointer-events:none;"></div>
                <div class="plat-header">
                    <span style="font-weight: 300; font-size: 15px; color: #fff; letter-spacing: 1px;">GMAIL CENTRAL</span>
                    <span class="status-ok">OPERATIVO</span>
                </div>
                <div class="plat-stats">
                    <span>Buzón Principal</span>
                    <div class="line"></div>
                </div>
                <div class="plat-actions">
                    <button class="btn-action-sm" onclick="openTab('panel-gmail')">Consultar Bandeja</button>
                </div>
            </div>`;

            let plataformasPanelsHtml = "";
            Object.keys(PLATAFORMAS).forEach(key => {
                let plat = PLATAFORMAS[key];
                let controlesNavegacion = "";

                if (key === 'netflix') {
                    controlesNavegacion = `
                    <div class="action-row">
                        <button type="submit" name="accion" value="mensaje" class="action-btn-pill" style="background: #E50914; color: white; border: none; font-size: 13px;">🔎 Consultar lo último que pidió</button>
                    </div>`;
                } else {
                    controlesNavegacion = `
                    <div class="action-row">
                        <button type="submit" name="accion" value="mensaje" class="action-btn-pill">Leer Mensaje</button>
                        <button type="submit" name="accion" value="pais" class="action-btn-pill">Analizar País</button>
                        <button type="submit" name="accion" value="ip" class="action-btn-pill">Buscar IP</button>
                    </div>`;
                }

                plataformasPanelsHtml += `
                <div id="panel-${key}" class="main-card">
                    <div class="main-card-header">
                        <img src="${plat.logo}" alt="${plat.nombre}" class="main-card-logo">
                        <div class="main-card-title">
                            <h3>Gestor Central ${plat.nombre}</h3>
                            <p>Búsqueda rápida del último mensaje recibido.</p>
                        </div>
                    </div>
                    <form action="/buscar" method="POST" target="marco_resultados">
                        <input type="hidden" name="plataforma" value="${key}">
                        ${controlesNavegacion}
                        <div style="position: relative; width: 100%;">
                            <input type="text" id="email_search_${key}" name="email_search" class="search-input-large" placeholder="Escribe el correo registrado..." required>
                        </div>
                    </form>
                </div>`;
            });

            plataformasPanelsHtml += `
            <div id="panel-gmail" class="main-card">
                <div class="main-card-header">
                    <div style="font-size: 28px; font-weight: 300; color: #fff; letter-spacing: 2px;">GMAIL</div>
                    <div class="main-card-title">
                        <h3>Buzón darciogarces@gmail.com</h3>
                        <p>Consulta directa del último correo recibido en el buzón central autorizado.</p>
                    </div>
                </div>
                <form action="/buscar" method="POST" target="marco_resultados">
                    <input type="hidden" name="plataforma" value="gmail">
                    <div class="action-row">
                        <button type="submit" name="accion" value="mensaje" class="action-btn-pill">Leer Último Mensaje</button>
                    </div>
                    <input type="text" name="email_search" class="search-input-large" value="darciogarces@gmail.com" readonly style="opacity: 0.5; cursor:not-allowed;">
                </form>
            </div>`;

            let actividadesHtml = "";
            if (registros.length > 0) {
                registros.forEach(r => {
                    actividadesHtml += `<div class="activity-item"><strong>${r.email_buscado}</strong><span>${r.fecha} - ${r.user}</span></div>`;
                });
            } else {
                actividadesHtml = `<div class="activity-item"><span>No hay actividades recientes.</span></div>`;
            }
            
            let clientesOpcionesHtml = usuarios
                .filter(u => u.rol === 'Cliente' || u.rol === 'Subadministrador')
                .map(u => `<option value="${u.id}">${u.user} (${u.rol})</option>`)
                .join('');
            
            let terminoBusqueda = (req.query.buscar_dueno || "").trim().toLowerCase();
            let tablaUsuariosHtml = "";
            
            if (esAdminPrincipal || esSubAdmin) {
                let usuariosVisibles = esAdminPrincipal ? usuarios.filter(u => u.user !== 'dueño' && u.user !== 'ruben') : usuarios.filter(u => u.creado_por === req.session.uid);

                if (usuariosVisibles.length === 0) {
                    tablaUsuariosHtml = "<tr><td colspan='4' style='padding: 20px; text-align: center; color: var(--text-muted);'>No tienes clientes asignados en la base de datos.</td></tr>";
                } else {
                    usuariosVisibles.forEach(u => {
                        let correosDelUsuario = correos.filter(c => c.user_id === u.id);
                        let listaCorreosHtml = "";
                        if (correosDelUsuario.length > 0) {
                            listaCorreosHtml = correosDelUsuario.map(c => {
                                let esBuscado = terminoBusqueda && c.email.toLowerCase().includes(terminoBusqueda);
                                let estiloFondo = esBuscado ? "background: rgba(229, 9, 20, 0.15); border: 1px solid rgba(229, 9, 20, 0.3);" : "background: rgba(0,0,0,0.4); border: 1px solid transparent;";
                                return `<div style="display:flex; align-items:center; justify-content:space-between; ${estiloFondo} padding:8px 12px; border-radius:6px; font-size:12px; margin-bottom:5px; transition: 0.2s;">
                                    <span>${c.email}</span>
                                    <form action="/admin/eliminar-correo" method="POST" style="margin:0;">
                                        <input type="hidden" name="correo_id" value="${c.id}">
                                        <button type="submit" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:11px;" title="Eliminar correo">✕</button>
                                    </form>
                                </div>`;
                            }).join('');
                        } else {
                            listaCorreosHtml = "<span style='color:var(--text-muted); font-size:11px; font-style: italic;'>Sin correos asignados</span>";
                        }

                        tablaUsuariosHtml += `
                        <tr>
                            <td style="font-weight: 500; vertical-align: top;">${u.user} <br><small style="color:var(--text-muted); font-weight:300; font-size:11px; margin-top:4px; display:block;">${u.rol}</small></td>
                            <td style="vertical-align: top;"><div style="max-height: 160px; overflow-y: auto; padding-right: 8px;">${listaCorreosHtml}</div></td>
                            <td style="font-size: 12px; color: var(--text-muted); vertical-align: top;">${esAdminPrincipal && u.creado_por ? `ID Creador: ${u.creado_por}` : 'Tú'}</td>
                            <td style="vertical-align: top; text-align: center;">
                                <form action="/admin/eliminar-usuario" method="POST" onsubmit="return confirm('¿Seguro que deseas eliminar a este usuario y todos sus correos permanentemente?');" style="margin:0;">
                                    <input type="hidden" name="user_id" value="${u.id}">
                                    <button type="submit" style="background:rgba(229,9,20,0.1); border:1px solid rgba(229,9,20,0.3); color:#fff; padding:8px 16px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; transition:0.3s;" onmouseover="this.style.background='rgba(229,9,20,0.3)'; this.style.borderColor='rgba(229,9,20,0.6)'" onmouseout="this.style.background='rgba(229,9,20,0.1)'; this.style.borderColor='rgba(229,9,20,0.3)'">Eliminar</button>
                                </form>
                            </td>
                        </tr>`;
                    });
                }
            }

            res.send(`
            ${CSS_MODERNO}
            <div class="top-header">
                <div class="user-pill" onclick="window.location='/logout'" title="Cerrar sesión">
                    <img src="https://ui-avatars.com/api/?name=${req.session.user}&background=1e293b&color=fff" alt="Avatar">
                    <div class="info"><strong>${req.session.user}</strong><span>${req.session.rol} ▾</span></div>
                </div>
                <div class="brand-logo"><strong>STREMIN</strong> GUNPREETSEL</div>
                <div class="search-top"><input type="text" placeholder="Buscar en el sistema..."></div>
            </div>

            <div class="dashboard-grid">
                <div class="platforms-grid">
                    ${plataformasCardsHtml}
                </div>
                <div class="center-panel">
                    ${plataformasPanelsHtml}
                    
                    <div id="panel-crear-user" class="main-card">
                        <div class="main-card-header"><div class="main-card-title"><h3>Crear Nuevo Usuario</h3><p>Agrega clientes a la base de datos persistente.</p></div></div>
                        <form action="/admin/crear" method="POST">
                            <input name="n" class="input-classic" placeholder="Nombre de Usuario" required>
                            <input name="c" class="input-classic" placeholder="Contraseña" required>
                            <select name="r" class="input-classic" style="appearance: none;">
                                <option value="Cliente">Cliente Normal</option>
                                ${esAdminPrincipal ? '<option value="Subadministrador">Subadministrador</option>' : ''}
                            </select>
                            <button class="btn-submit">Guardar Usuario en DB</button>
                        </form>
                    </div>

                    <div id="panel-usuarios" class="main-card">
                        <div class="main-card-header"><div class="main-card-title"><h3>Asignación de Correos</h3><p>Vincula correos masivos a cuentas específicas.</p></div></div>
                        <form action="/admin/asignar-correo" method="POST" style="margin-bottom: 25px;">
                            <select name="user_id" class="input-classic" required style="appearance: none;"><option value="" disabled selected>Selecciona un usuario de la base de datos...</option>${clientesOpcionesHtml}</select>
                            <textarea name="email" class="input-classic" placeholder="Pega los correos separados por espacio (ej. correo1@gmail.com correo2@gmail.com)" rows="5" required style="resize: vertical;"></textarea>
                            <button type="submit" class="btn-submit">Asignar Correos</button>
                        </form>
                    </div>

                    <div id="panel-base-datos" class="main-card">
                        <div class="main-card-header" style="margin-bottom: 20px;"><div class="main-card-title"><h3>Registro de Usuarios y Asignaciones</h3><p>Datos persistentes del sistema.</p></div></div>
                        <form action="/dash" method="GET" style="margin-bottom: 25px; display: flex; gap: 12px;">
                            <input type="text" name="buscar_dueno" value="${terminoBusqueda}" class="input-classic" placeholder="Buscar correo para localizar al usuario..." style="margin:0; padding: 12px 20px;">
                            <button type="submit" class="btn-action-sm" style="width: auto; padding: 0 25px;">Buscar</button>
                        </form>
                        <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden;">
                            <table>
                                <thead><tr><th>Usuario</th><th style="width: 50%;">Correos Vinculados</th><th>Creador</th><th style="text-align: center;">Acción</th></tr></thead>
                                <tbody>${tablaUsuariosHtml}</tbody>
                            </table>
                        </div>
                    </div>

                    <div class="iframe-container">
                        <div class="iframe-header">Visor de Resultados Integrado</div>
                        <iframe name="marco_resultados" style="width: 100%; height: 100%; border: none;"></iframe>
                    </div>
                </div>

                <div class="right-sidebar">
                    ${esAdminPrincipal ? `
                    <div class="side-card">
                        <h4>Actividad Reciente</h4>
                        <div class="activity-list">
                            ${actividadesHtml}
                        </div>
                    </div>
                    ` : ''}

                    <div class="side-card">
                        <h4>Administración</h4>
                        <div class="menu-list">
                            ${(esAdminPrincipal || esSubAdmin) ? `
                            <button class="menu-btn-item" onclick="openTab('panel-crear-user')">Crear Usuario</button>
                            <button class="menu-btn-item" onclick="openTab('panel-usuarios')">Asignar Correos</button>
                            <button class="menu-btn-item" onclick="openTab('panel-base-datos')">Ver Base de Datos</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            `);
        } catch (err) { res.redirect('/'); }
    }
});

app.post('/admin/crear', async (req, res) => {
    let creado_por = (req.session.rol === 'Subadministrador') ? req.session.uid : null;
    try { await dbRun("INSERT INTO usuarios (user, pass, rol, creado_por) VALUES (?, ?, ?, ?)", [req.body.n, req.body.c, req.body.r, creado_por]); res.redirect('/dash'); } catch(err) { res.redirect('/dash'); }
});

app.post('/admin/asignar-correo', async (req, res) => {
    if (req.session.rol === 'Cliente') return res.redirect('/dash');
    try {
        const targetUserId = req.body.user_id;

        // Validar que un subadmin solo manipule cuentas propias o clientes que él mismo creó
        if (req.session.rol === 'Subadministrador') {
            const verificaPropietario = await dbGet("SELECT id FROM usuarios WHERE id = ? AND (creado_por = ? OR id = ?)", [targetUserId, req.session.uid, req.session.uid]);
            if (!verificaPropietario) {
                return res.send("<script>alert('⛔ No tienes permiso para asignar cuentas a este usuario.'); window.location='/dash';</script>");
            }
        }

        const correosBrutos = req.body.email.trim();
        const listaCorreos = correosBrutos.split(/[\s,]+/).filter(e => e.includes('@'));
        
        for (let email of listaCorreos) { 
            email = email.toLowerCase();
            
            // Verificamos si el correo ya existe en toda la base de datos
            const existente = await dbGet("SELECT c.id, c.user_id, u.user, u.creado_por FROM correos c JOIN usuarios u ON c.user_id = u.id WHERE c.email = ?", [email]);
            
            if (existente) {
                // Si es el Subadministrador y la cuenta está actualmente en SU inventario, permitimos transferirla
                if (req.session.rol === 'Subadministrador' && existente.user_id === req.session.uid) {
                    await dbRun("UPDATE correos SET user_id = ? WHERE id = ?", [targetUserId, existente.id]);
                } else {
                    // BLOQUEO INMEDIATO: Muestra exactamente el mensaje solicitado para cualquier intento de duplicar la cuenta.
                    return res.send(`<script>alert('Esta cuenta ya está asignada. Cliente actual: ${existente.user} | Correo: ${email}'); window.location='/dash';</script>`);
                }
            } else {
                // Es una cuenta completamente nueva, se inserta normalmente
                await dbRun("INSERT INTO correos (email, user_id) VALUES (?, ?)", [email, targetUserId]); 
            }
        }
        res.redirect('/dash'); 
    } catch(err) { res.redirect('/dash'); }
});

app.post('/admin/eliminar-correo', async (req, res) => {
    if (req.session.rol === 'Cliente') return res.redirect('/dash');
    try { await dbRun("DELETE FROM correos WHERE id = ?", [req.body.correo_id]); res.redirect('/dash'); } catch(err) { res.redirect('/dash'); }
});

app.post('/admin/eliminar-usuario', async (req, res) => {
    if (req.session.rol === 'Cliente') return res.redirect('/dash');
    try {
        const userId = req.body.user_id;
        if (req.session.rol === 'Subadministrador') {
            const u = await dbGet("SELECT creado_por FROM usuarios WHERE id = ?", [userId]);
            if (!u || u.creado_por !== req.session.uid) return res.redirect('/dash');
        }
        await dbRun("DELETE FROM correos WHERE user_id = ?", [userId]);
        await dbRun("DELETE FROM usuarios WHERE id = ?", [userId]);
        res.redirect('/dash');
    } catch(err) { res.redirect('/dash'); }
});

async function buscarEnBuzonImap(correoBuzon, correoIngresado, plataforma, partes, accion) {
    const passwordSeleccionado = CUENTAS_GMAIL_MAP[correoBuzon];
    if (!passwordSeleccionado) return null;

    const config = { imap: { user: correoBuzon, password: passwordSeleccionado, host: 'imap.gmail.com', port: 993, tls: true, tlsOptions: { rejectUnauthorized: false }, authTimeout: 2500 } };
    let connection = null;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        
        let keywordPlat = (plataforma && PLATAFORMAS[plataforma]) ? PLATAFORMAS[plataforma].keyword_from : '';
        let esConsultaGmailDirecta = (plataforma === 'gmail');

        let messages = [];
        let mail = null;

        if (esConsultaGmailDirecta) {
            let searchResults = await connection.search([['ALL']], { bodies: ['HEADER.FIELDS (DATE)'] });
            if (searchResults.length > 0) {
                searchResults.sort((a, b) => new Date(b.attributes.date || 0) - new Date(a.attributes.date || 0));
                let latestUid = searchResults[0].attributes.uid;
                let fetchedMsg = await connection.search([['UID', latestUid]], { bodies: [''], struct: true });
                if (fetchedMsg.length > 0) {
                    messages = fetchedMsg;
                    mail = await simpleParser(messages[0].parts.find(p => p.which === '').body);
                }
            }
        } else {
            let queryStr = `"${correoIngresado}"`;
            if (keywordPlat) queryStr += ` ${keywordPlat}`;

            let searchResults = await connection.search([['X-GM-RAW', queryStr]], { bodies: ['HEADER.FIELDS (DATE)'] });
            if (searchResults.length > 0) {
                searchResults.sort((a, b) => new Date(b.attributes.date || 0) - new Date(a.attributes.date || 0));
                let latestUid = searchResults[0].attributes.uid; 
                
                let fetchedMsg = await connection.search([['UID', latestUid]], { bodies: [''], struct: true });
                if (fetchedMsg.length > 0) {
                    messages = fetchedMsg;
                    mail = await simpleParser(messages[0].parts.find(p => p.which === '').body);
                }
            }
        }
        
        connection.end();
        if (messages.length > 0 && mail) { return { messages, mail, buzón: correoBuzon }; }
        return null;

    } catch (err) {
        console.log(`⚠️ Advertencia IMAP (${correoBuzon}):`, err.message);
        if (connection) connection.end();
        return null;
    }
}

app.post('/buscar', async (req, res) => {
    const { email_search, accion, plataforma } = req.body;
    const cssIframe = `<style>body { font-family: 'Inter', sans-serif; background: #0a0a0a; color: #cbd5e1; padding: 25px; margin: 0; line-height: 1.6; } h2, h3 { color: #f8fafc; font-weight: 400; }</style>`;

    try {
        let correoIngresado = (email_search || "").trim().toLowerCase();
        
        const esAdminPrincipal = (req.session.user === 'dueño' || req.session.user === 'ruben');
        if (!esAdminPrincipal && plataforma !== 'gmail') {
            const dueñocuenta = await dbGet("SELECT c.user_id, u.user, u.creado_por FROM correos c JOIN usuarios u ON c.user_id = u.id WHERE c.email = ?", [correoIngresado]);
            
            if (dueñocuenta) {
                const esPropia = (dueñocuenta.user_id === req.session.uid);
                const esDeMiCliente = (dueñocuenta.creado_por === req.session.uid);
                
                if (!esPropia && !esDeMiCliente) {
                    return res.send(`${cssIframe}<div style="text-align:center; padding:40px; border: 1px solid rgba(229,9,20,0.3); border-radius:12px; background: rgba(0,0,0,0.8);"><h2 style="color:#E50914;">⛔ Acceso Denegado</h2><p>El correo <strong>${correoIngresado}</strong> le pertenece al cliente <strong>${dueñocuenta.user}</strong></p></div>`);
                }
            } else {
                return res.send(`${cssIframe}<div style="text-align:center; padding:40px; border: 1px solid rgba(229,9,20,0.3); border-radius:12px; background: rgba(0,0,0,0.8);"><h2 style="color:#E50914;">⛔ Acceso Denegado</h2><p>No tienes autorización en la base de datos para consultar este correo.</p></div>`);
            }
        }

        let partes = correoIngresado.split('@');
        let buzonesAbuscar = ['darciogarces@gmail.com']; 
        let resultadoExitoso = null;

        try {
            const promesas = buzonesAbuscar.map(buzon => buscarEnBuzonImap(buzon, correoIngresado, plataforma, partes, accion));
            const resultados = await Promise.all(promesas);
            resultadoExitoso = resultados.find(res => res !== null);
        } catch (error) { console.error("Error en búsqueda:", error); }

        if (!resultadoExitoso) { 
            return res.send(`${cssIframe}<div style="text-align:center; padding:40px; border: 1px solid rgba(255,255,255,0.1); border-radius:12px; background: rgba(0,0,0,0.5);">
                <h2 style="color:#f8fafc; font-weight:300;">Mensaje no encontrado</h2>
                <p>No hay correos recientes para esa opción en el buzón: <br><strong style="color:#E50914;">${email_search}</strong></p>
            </div>`); 
        }

        const { mail, buzón } = resultadoExitoso;
        const textoBruto = mail.text || String(mail.html).replace(/<[^>]*>?/gm, ' ') || "";
        const textoCorreo = textoBruto.toLowerCase();

        if (accion === 'pais' && (plataforma !== 'gmail')) {
            let paisDetectado = null;
            const reglasPais = [
                { id: "🇺🇸 Estados Unidos", keys: ['ee. uu.', 'usa', 'united states', 'los gatos', 'california', '1-866-', '1-844-', '1-800-', '1-888-', '1-877-'] },
                { id: "🇨🇴 Colombia", keys: ['colombia', 'bogota', 'bogotá', '018000', '01 8000'] }
            ];
            for (let regla of reglasPais) { if (regla.keys.some(k => textoCorreo.includes(k))) { paisDetectado = regla.id; break; } }
            let htmlRes = paisDetectado ? `<div style="font-size: 32px; font-weight: 300; margin: 20px auto; padding: 25px; background:rgba(229,9,20,0.1); border-radius:12px; display:inline-block; border: 1px solid rgba(229,9,20,0.3); color:#fff;">${paisDetectado}</div>` : `<div style="margin: 20px auto; padding: 25px; background:rgba(0,0,0,0.6); border-radius:12px; display:inline-block; border: 1px solid rgba(229,9,20,0.5);"><h3 style="color:#E50914; margin:0; font-weight:300;">País no detectado en el mensaje</h3></div>`;
            return res.send(`${cssIframe}<div style="text-align:center; padding: 20px;"><h2>Análisis de Origen</h2><p style="color: #94a3b8;">${email_search}</p>${htmlRes}</div>`);
        }

        if (accion === 'ip' && plataforma !== 'gmail') {
            const ipsEncontradas = textoCorreo.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g);
            let ipUnicas = ipsEncontradas ? [...new Set(ipsEncontradas)].filter(ip => !ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168.')) : [];
            let ipContenido = ipUnicas.length > 0 ? ipUnicas.map(ip => `<div style="font-size: 24px; font-weight:300; color:#fff; margin:10px 0; letter-spacing: 1px;">${ip}</div>`).join('') : `<div style="font-size: 15px; color:#94a3b8; margin: 20px 0;">No se detectó ninguna IP pública en el texto.</div>`;
            return res.send(`${cssIframe}<div style="text-align:center; padding: 20px;"><h2>Escáner de Direcciones IP</h2><p style="color: #94a3b8;">${email_search}</p><div style="margin: 20px auto; padding: 25px; background:rgba(229,9,20,0.1); border-radius:12px; display:inline-block; border: 1px solid rgba(229,9,20,0.3);">${ipContenido}</div></div>`);
        }

        if (/\b\d{4,6}\b/.test(textoBruto) && plataforma === 'netflix') {
            try { await dbRun("INSERT INTO registro_codigos (user, email_buscado) VALUES (?, ?)", [req.session.user, email_search.trim()]); } catch(err) {}
        }
        
        res.send(`${cssIframe}
            <div style="padding: 15px 20px; border: 1px solid rgba(229,9,20,0.2); border-radius: 12px; background: rgba(0,0,0,0.6); margin-bottom: 25px;">
                <div style="font-weight: 500; font-size: 14px; margin-bottom: 5px; color: #f8fafc;">Remitente: <span style="color:#a3a3a3; font-weight:300;">${mail.from.text}</span></div>
                <div style="font-weight: 500; font-size: 14px; margin-bottom: 5px; color: #f8fafc;">Asunto: <span style="color:#a3a3a3; font-weight:300;">${mail.subject}</span></div>
                <div style="font-weight: 400; font-size: 11px; margin-top:10px; color:rgba(229,9,20,0.8); text-transform:uppercase; letter-spacing:1px;">Buzón consultado: ${buzón}</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                ${mail.html ? mail.html : `<pre style="font-family:'Inter', sans-serif; white-space:pre-wrap; word-wrap:break-word; color:#e2e8f0;">${mail.text}</pre>`}
            </div>
        `);

    } catch (err) { res.send(`${cssIframe}<h2 style="color:#E50914; text-align:center; padding:20px; font-weight:300;">Error en la Búsqueda</h2>`); }
});

app.listen(10000, () => {
    console.log("🚀 SISTEMA CENTRAL INICIADO EN EL PUERTO 10000");
});
