# Cómo subirlo a GitHub

Tablero de candidaturas en React 19: arrastrar y soltar accesible con teclado, métricas y estados de error diseñados.

## 1 · Crear el repositorio y subirlo

En GitHub, crea un repositorio nuevo llamado `gestor-postulaciones`, **público** y **vacío**
(sin README, sin licencia, sin .gitignore — ya están aquí). Después, desde esta
carpeta:

```bash
git init
git add .
git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/danielbuitragoh/gestor-postulaciones.git
git push -u origin main
```

Si la carpeta ya tenía git, sáltate `git init` y `git branch -M main`.

## 2 · Antes de publicar, comprueba

Que no sube ningún secreto:

```bash
git ls-files | grep -iE "\.env$|secret|credential"
```

Debe devolver vacío (o solo archivos `.ejemplo`).

## 3 · Encender la demo

**Settings → Pages → Source: GitHub Actions** si quieres demo pública. Necesita que la API esté desplegada en algún sitio y apuntar `VITE_API` a ella.



## 4 · Los dos minutos que más rinden

En la portada del repositorio, junto a **About** (arriba a la derecha, el
engranaje):

- **Descripción:** Tablero de candidaturas en React 19: arrastrar y soltar accesible con teclado, métricas y estados de error diseñados.
- **Website:** el enlace de la demo si la hay, y si no, tu portafolio.
- **Topics:** `react, typescript, vite, dnd-kit, accessibility, kanban, frontend`

Los topics son lo que hace que el repositorio aparezca en búsquedas de GitHub.

Y fíjalo en tu perfil: **tu perfil → Customize your pins**.
