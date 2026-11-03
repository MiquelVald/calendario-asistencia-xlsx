# Instalación privada en Linux

El servidor de la aplicación es `10.218.108.59`. El recurso compartido se monta en modo de solo lectura y la aplicación obtiene de ahí el formato base automáticamente.

## 1. Paquetes y usuario de servicio

Ejemplo para Debian o Ubuntu:

```bash
sudo apt update
sudo apt install -y cifs-utils nginx nodejs git
sudo useradd --system --home /opt/justificaciones --shell /usr/sbin/nologin justificaciones
sudo mkdir -p /opt/justificaciones /etc/justificaciones /mnt/documentos
```

## 2. Credenciales del recurso compartido

Crea `/etc/justificaciones/smb-credentials` únicamente en el servidor. No lo agregues al repositorio:

```text
username=USUARIO_DE_RED
password=CONTRASEÑA_DE_RED
domain=DOMINIO
```

Protégelo con:

```bash
sudo chown root:root /etc/justificaciones/smb-credentials
sudo chmod 600 /etc/justificaciones/smb-credentials
```

Agrega a `/etc/fstab`:

```fstab
//10.218.108.49/Documentos /mnt/documentos cifs ro,credentials=/etc/justificaciones/smb-credentials,vers=3.0,iocharset=utf8,_netdev,nofail,uid=justificaciones,gid=justificaciones,file_mode=0440,dir_mode=0550 0 0
```

Después ejecuta `sudo mount -a` y comprueba que la plantilla exista en `/mnt/documentos/2026 Formatos/Septiembre/2026 FormatodeVacacionesyPermisosOK.xlsx`.

## 3. Aplicación

```bash
sudo git clone https://github.com/MiquelVald/calendario-asistencia-xlsx.git /opt/justificaciones
sudo chown -R justificaciones:justificaciones /opt/justificaciones
sudo cp /opt/justificaciones/deploy/justificaciones.env.example /etc/justificaciones/justificaciones.env
sudo cp /opt/justificaciones/deploy/justificaciones.service.example /etc/systemd/system/justificaciones.service
sudo systemctl daemon-reload
sudo systemctl enable --now justificaciones
curl http://127.0.0.1:8080/api/health
```

La respuesta debe incluir `"templateReady":true` y `"reportsReady":true`. El servidor mostrará las carpetas mensuales ubicadas en `/mnt/documentos/2026 Formatos/2026 Reporte Lista de Asistencia` y elegirá el archivo XLSX con la fecha más reciente en su nombre.

## 4. Nginx

```bash
sudo cp /opt/justificaciones/deploy/nginx-justificaciones.conf.example /etc/nginx/sites-available/justificaciones
sudo ln -s /etc/nginx/sites-available/justificaciones /etc/nginx/sites-enabled/justificaciones
sudo nginx -t
sudo systemctl reload nginx
```

En la red interna se abrirá `http://10.218.108.59/`. Si se prefiere acceder directamente al puerto 8080, cambia `HOST=0.0.0.0` y permite ese puerto sólo desde la subred interna.

## Actualizaciones

```bash
cd /opt/justificaciones
sudo -u justificaciones git pull --ff-only
sudo systemctl restart justificaciones
```

La contraseña SMB y cualquier certificado TLS deben permanecer únicamente en el servidor.
