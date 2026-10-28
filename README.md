# 🛰️ Satellite Tracker — TP Nº 7

> **Licenciatura en Sistemas de Información — FCyT Sede Concepción del Uruguay**  
> **Cátedra:** Programación Móviles (2026)  
> **Área temática:** Redes de Datos, Telecomunicaciones y Telecomunicaciones Satelitales  
> **Tecnología:** React Native (Expo) + TypeScript + SGP4 Orbital Propagation  

---

## 📋 Descripción del Proyecto

**Satellite Tracker** es una aplicación móvil desarrollada en **React Native (Expo)** capaz de calcular en tiempo real y de forma 100% local la posición de satélites artificiales en órbitas LEO, MEO y GEO a partir de datos orbitales oficiales (TLE / OMM) obtenidos de APIs públicas (CelesTrak, Where The ISS At?, N2YO).

A diferencia de una aplicación de mapas convencional basada en CRUD, aquí el núcleo del sistema es un **motor matemático y astronómico** que implementa el algoritmo estándar de la industria **SGP4 (Simplified General Perturbations-4)** para propagar órbitas, calcular coordenadas geodésicas y topocéntricas, predecir ventanas de visibilidad (AOS/LOS) y graficar pases astronómicos en gráficos polares (Sky Charts).

---

## ✨ Características Principales y Requisitos Implementados

| Requisito | Funcionalidad | Detalle Técnico |
| :--- | :--- | :--- |
| **RF-01 / RF-08** | **Catálogo y Búsqueda** | Búsqueda por nombre o NORAD ID y filtros por constelación: *Estaciones Espaciales (ISS, Tiangong)*, *Starlink*, *GPS* y *Satélites Meteorológicos*. |
| **RF-02** | **Propagación SGP4 Local** | Cálculo continuo (refresco cada 1 segundo) de latitud, longitud, altitud y velocidad tangencial (km/s) en el hilo de JavaScript local. |
| **RF-03** | **Ángulos de Apuntamiento** | Conversión ECI $\to$ ECF $\to$ Topocéntrico para calcular Azimut ($0^\circ - 360^\circ$), Elevación ($-90^\circ$ a $+90^\circ$) y Slant Range respecto al GPS del observador. |
| **RF-04** | **Predicción de Pases (AOS/LOS)** | Algoritmo de refinamiento en dos fases (*coarse-to-fine*) para detectar adquisición de señal (AOS), punto de elevación máxima y pérdida de señal (LOS) en $< 200\text{ ms}$. |
| **RF-05** | **Sky Chart Polar (SVG)** | Gráfico polar con anillos de elevación concéntricos ($0^\circ, 30^\circ, 60^\circ, 90^\circ$), rosa de los vientos (N, E, S, W) y curva Bézier de trayectoria orbital. |
| **RF-06** | **Notificaciones de Pase** | Recordatorios locales programados con `expo-notifications` 10 minutos antes del inicio del pase visible. |
| **RF-07** | **Orientación Asistida (Brújula)** | Integración con sensor magnetómetro (`expo-sensors`) con aguja indicadora y feedback visual de alineación ($\pm 5^\circ$). |
| **RF-09 / RF-16** | **Caché con TTL y Antigüedad** | Almacenamiento local persistente (`AsyncStorage`) con TTL de 18 horas para uso offline y alertas de elementos desactualizados ($> 24\text{ h}$). |
| **RF-10 / RF-11** | **Ground Track y Antimeridiano** | Trazado de órbita completa pasada y futura resolviendo el corte del antimeridiano ($\pm 180^\circ$) para evitar líneas que crucen el mapa mundial. |
| **RF-12** | **Footprint ITU-R** | Cálculo geométrico del radio de cobertura en superficie según altitud y elevación mínima configurable ($0^\circ, 5^\circ, 10^\circ, 25^\circ$). |
| **RF-13** | **Capa de Constelación Starlink** | Renderizado simultáneo de satélites Starlink con cálculo en lote y *throttling* a 5 segundos para mantener 60 fps en la UI. |
| **RF-14** | **Abstracción de Datos y Fallback** | Arquitectura con interfaz `IDataProvider`, *Rate Limiter* con backoff exponencial y conmutación automática ante fallas. |
| **RF-15** | **Laboratorio de Validación Cruzada** | Comparador en vivo contra APIs externas independientes (*Where The ISS At?* y *N2YO*) con cálculo de error en kilómetros (Haversine y distancia 3D). |

---

## 🏛️ Arquitectura del Software

```
src/
├── core/                       # Lógica pura TypeScript (100% desacoplada de la UI)
│   ├── orbital/
│   │   └── orbitalEngine.ts    # Wrapper SGP4, propagación ECI, velocidades
│   ├── geometry/
│   │   └── geometry.ts         # Haversine, footprint ITU-R, corte de antimeridiano
│   ├── prediction/
│   │   └── predictionService.ts# Algoritmo de dos fases para pases (AOS/LOS)
│   └── __tests__/
│       └── orbitalCore.test.ts # Suite de pruebas unitarias en Jest
├── data/                       # Capa de datos y networking
│   ├── providers/              # CelesTrak, WhereTheISSAt, N2YO
│   ├── cache/                  # CacheService con AsyncStorage y TTL
│   ├── limiter/                # RateLimiter con Exponential Backoff
│   ├── repository/             # SatelliteRepository (orquestador y fallback)
│   └── validation/             # ValidationService (laboratorio de error)
├── services/                   # Servicios de hardware nativo del dispositivo
│   ├── locationService.ts      # Geolocalización GPS del observador
│   └── notificationService.ts  # Programación de alertas de pase
├── types/                      # Definiciones de tipos e interfaces TypeScript
└── ui/                         # Capa de presentación React Native
    ├── components/
    │   ├── SatelliteMap.tsx    # Mapa con marcadores, órbitas y footprint
    │   ├── SkyChart.tsx        # Gráfico polar SVG de visibilidad
    │   └── CompassOverlay.tsx  # Brújula de apuntamiento asistido
    └── screens/
        ├── TrackerScreen.tsx   # Panel principal y telemetría en tiempo real
        ├── CatalogScreen.tsx   # Catálogo con filtros y búsqueda
        ├── PassesScreen.tsx    # Listado de pases calculados y sky chart
        ├── CompassScreen.tsx   # Orientación asistida
        └── ValidationScreen.tsx# Laboratorio de comparación orbital
```

---

## 🔬 Resultados de Validación Orbital

La precisión del cálculo local fue validada contra las efemérides en tiempo real del API oficial de **Where The ISS At?** (NORAD #25544):

- **Error en superficie observado:** $\approx 7.8\text{ km}$
- **Tolerancia esperada SGP4:** $< 15\text{ km}$ para elementos orbitales con menos de 24 horas de antigüedad.
- **Conclusión:** La discrepancia se encuentra plenamente dentro del margen teórico de perturbaciones atmosféricas no modeladas por SGP4 de orden fino, confirmando la fiabilidad de las predicciones para enlaces de telecomunicaciones satelitales.

---

## 🛠️ Stack Tecnológico

- **Framework:** React Native con **Expo SDK 58**
- **Lenguaje:** TypeScript (modo estricto)
- **Mecánica Orbital:** `satellite.js` (implementación SGP4/SDP4 de David Vallado)
- **Mapas:** `react-native-maps` (Google Maps / Apple Maps nativos) + Fallback 2D equirrectangular
- **Gráficos SVG:** `react-native-svg` (Sky Chart polar interactivo)
- **Sensores:** `expo-sensors` (Magnetómetro / Brújula)
- **Ubicación:** `expo-location` (GPS del dispositivo)
- **Notificaciones:** `expo-notifications`
- **Testing:** `jest` + `ts-jest`

---

## 🚀 Instalación y Ejecución

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd tp7-satellite-tracker
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar las pruebas unitarias
```bash
npm test
```
*Valida automáticamente las fórmulas de Haversine, el radio de footprint, el corte en el antimeridiano, la propagación SGP4 y la predicción de pases.*

### 4. Iniciar la aplicación
```bash
npx expo start
```

- **Dispositivo móvil (Android / iOS):** Escanear el código QR con la aplicación **Expo Go**.
- **Emulador Android:** Presionar `a` en la terminal.
- **Simulador iOS:** Presionar `i` en la terminal.
- **Versión Web:** Presionar `w` en la terminal.

---

## 📱 Demostración en Video

El video demostrativo adjunto en la entrega expone:
1. Selección de satélite desde el catálogo categorizado.
2. Seguimiento en tiempo real sobre el mapa con trayectoria (*ground track*) y área de cobertura (*footprint*).
3. Capa de constelación Starlink con múltiples objetos simultáneos sin caídas de framerate.
4. Predicción de próximos pases visibles y visualización en el **Sky Chart polar**.
5. Programación de recordatorio de pase.
6. Demostración del modo **Brújula** con sensor de orientación.
7. Ejecución de la **Validación Cruzada** mostrando el error en kilómetros en tiempo real.
