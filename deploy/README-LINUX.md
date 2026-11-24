# Instalación privada en Linux

El servidor de la aplicación es `10.218.108.59`. Los dos proyectos se ejecutan en la misma máquina: empleados en el puerto 8080 y administración en el 8081.

## 1. Paquetes y usuario de servicio

Ejemplo para Debian o Ubuntu:

```bash
sudo apt update
sudo apt install -y cifs-utils nginx nodejs git
sudo useradd --system --home /opt/justificaciones --shell /usr/sbin/nologin justificaciones
sudo mkdir -p /opt/justificaciones /opt/vacaciones-admin /etc/justificaciones /mnt/documentos /var/lib/vacaciones-admin
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
//10.218.108.49/Documentos /mnt/documentos cifs rw,credentials=/etc/justificaciones/smb-credentials,vers=3.0,iocharset=utf8,_netdev,nofail,uid=justificaciones,gid=justificaciones,file_mode=0660,dir_mode=0770 0 0
```

Después ejecuta `sudo mount -a` y comprueba que existan:

```bash
test -r '/mnt/documentos/2026 Formatos/Septiembre/2026 FormatodeVacacionesyPermisosOK.xlsx'
test -r '/mnt/documentos/2026 Formatos/2026 Reporte Lista de Asistencia'
test -r '/mnt/documentos/Miguel Valdez/JustificacionesMiniApp/VacacionesDates.xlsx'
test -w '/mnt/documentos/Miguel Valdez/JustificacionesMiniApp/VacacionesDates.xlsx'
```

El montaje debe permitir escritura porque el panel administrativo actualiza la planilla. El servicio del puerto 8080 conserva acceso de solo lectura mediante `ReadOnlyPaths=/mnt/documentos`.

## 3. Aplicación de empleados (8080)

```bash
sudo git clone https://github.com/MiquelVald/calendario-asistencia-xlsx.git /opt/justificaciones
sudo chown -R justificaciones:justificaciones /opt/justificaciones
sudo cp /opt/justificaciones/deploy/justificaciones.env.example /etc/justificaciones/justificaciones.env
sudo cp /opt/justificaciones/deploy/justificaciones.service.example /etc/systemd/system/justificaciones.service
sudo systemctl daemon-reload
sudo systemctl enable --now justificaciones
curl http://127.0.0.1:8080/api/health
```

La respuesta debe incluir `"templateReady":true`, `"vacationsReady":true` y `"reportsReady":true`.

## 4. Panel administrativo (8081)

```bash
sudo git clone https://github.com/MiquelVald/vacaciones-admin.git /opt/vacaciones-admin
cd /opt/vacaciones-admin
sudo npm ci --omit=dev
sudo chown -R justificaciones:justificaciones /opt/vacaciones-admin /var/lib/vacaciones-admin
sudo install -m 600 -o root -g root /dev/null /etc/vacaciones-admin.env
sudo nano /etc/vacaciones-admin.env
```

Contenido de `/etc/vacaciones-admin.env`:

```text
VACACIONES_ADMIN_PASSWORD=CAMBIA_ESTA_CONTRASEÑA
VACACIONES_ADMIN_DATA=/var/lib/vacaciones-admin
VACACIONES_LEDGER_PATH="/mnt/documentos/Miguel Valdez/JustificacionesMiniApp/VacacionesDates.xlsx"
```

Instala el servicio:

```bash
sudo cp /opt/vacaciones-admin/vacaciones-admin.service.example /etc/systemd/system/vacaciones-admin.service
sudo systemctl daemon-reload
sudo systemctl enable --now vacaciones-admin
curl http://127.0.0.1:8081/api/health
```

## 5. Nginx y firewall

```bash
sudo cp /opt/justificaciones/deploy/nginx-justificaciones.conf.example /etc/nginx/sites-available/justificaciones
sudo ln -s /etc/nginx/sites-available/justificaciones /etc/nginx/sites-enabled/justificaciones
sudo nginx -t
sudo systemctl reload nginx
```

En la red interna se abrirá `http://10.218.108.59/`. Si se prefiere acceder directamente al puerto 8080, cambia `HOST=0.0.0.0` y permite ese puerto sólo desde la subred interna.

El panel administrativo se abre en `http://10.218.108.59:8081/`. Permite el puerto sólo en la red interna, por ejemplo:

```bash
sudo ufw allow from 10.218.108.0/24 to any port 8081 proto tcp
```

## Actualizaciones

```bash
cd /opt/justificaciones
sudo -u justificaciones git pull --ff-only
sudo systemctl restart justificaciones

cd /opt/vacaciones-admin
sudo -u justificaciones git pull --ff-only
sudo npm ci --omit=dev
sudo systemctl restart vacaciones-admin
```

La contraseña SMB y cualquier certificado TLS deben permanecer únicamente en el servidor.
