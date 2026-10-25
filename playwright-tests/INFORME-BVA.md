# Informe de Resumen de Pruebas — Ejercicio Práctico: Módulo de Registro de Usuarios

**Técnica aplicada:** Análisis de Valores Límite (BVA / *Boundary Value Analysis*)
**Aplicación:** RealWorld App (cypress-realworld-app) — página **Sign Up** (`/signup`)
**Framework de automatización:** Playwright Test (Chromium)
**Fecha de ejecución:** 2026-10-06
**Entorno:** `http://localhost:3000` (app corriendo vía contenedor Docker)

---

## 1. Regla de negocio a validar

> **El campo Contraseña del formulario de registro debe contener un mínimo de 4 caracteres.**

Ubicación de la regla en el código fuente
(`src/components/SignUpForm.tsx`):

```ts
const validationSchema = object({
  // ...
  password: string()
    .min(4, "Password must contain at least 4 characters")
    .required("Enter your password"),
  confirmPassword: string()
    .required("Confirm your password")
    .oneOf([ref("password")], "Password does not match"),
});
```

El botón **Sign Up** está `disabled={!isValid}`, por lo que una contraseña inválida
mantiene el botón deshabilitado y muestra el mensaje de error *inline*
(`helperText` del campo).

**Señales observables en la UI usadas para las aserciones:**

1. Mensaje de error visible/oculto: `"Password must contain at least 4 characters"`.
2. Estado habilitado/deshabilitado del botón **Sign Up**.

---

## 2. Diseño de casos de prueba (BVA)

La regla define un **límite inferior L = 4** caracteres (dominio de longitudes enteras ≥ 0).

### 2.1 Clases de equivalencia

| Clase | Rango de longitud | Resultado esperado |
|-------|-------------------|--------------------|
| Inválida | 0 – 3 caracteres | Se muestra el error; botón deshabilitado |
| Válida   | ≥ 4 caracteres   | Sin error; botón habilitado |

### 2.2 Valores límite seleccionados (técnica BVA, múltiple valor)

Para el límite inferior se prueban los valores **L-1**, **L**, **L+1**
y valores nominal alejados de cada clase:

| Valor de frontera | Longitud | Pertenece a |
|-------------------|----------|-------------|
| Muy por debajo    | 1        | Inválida    |
| Por debajo        | 2        | Inválida    |
| Límite - 1 (L-1)  | 3        | Inválida    |
| Límite (L)        | 4        | Válida      |
| Límite + 1 (L+1)  | 5        | Válida      |
| Nominal alto      | 10       | Válida      |

### 2.3 Tabla de casos de prueba

| ID | Descripción | Entrada (Contraseña) | Longitud | Resultado esperado |
|------|--------------------------------------------------|----------------------|:--------:|--------------------|
| TC-01 | Muy por debajo del límite | `a`          | 1  | Inválida → error visible, botón **disabled** |
| TC-02 | Bajo el límite | `ab`                     | 2  | Inválida → error visible, botón **disabled** |
| TC-03 | Límite inferior menos 1 (L-1) | `abc`          | 3  | Inválida → error visible, botón **disabled** |
| TC-04 | Exactamente en el límite (L) | `abcd`         | 4  | Válida → sin error, botón **enabled** |
| TC-05 | Límite inferior más 1 (L+1) | `abcde`        | 5  | Válida → sin error, botón **enabled** |
| TC-06 | Nominal válido alto | `abcd123456`   | 10 | Válida → sin error, botón **enabled** |

> En todos los casos se completan el resto de campos obligatorios
> (First Name, Last Name, Username único y Confirm Password = contraseña)
> para que **la única variable evaluada sea la longitud de la contraseña**.

---

## 3. Script de automatización

Archivo: [`bva-password.spec.ts`](./bva-password.spec.ts)

* Diseño **data-driven**: la tabla `casos` alimenta un `test()` por cada valor BVA.
* Atributo test-id de la app: `data-test` (configurado en `playwright.config.ts`
  con `testIdAttribute: 'data-test'`).
* Localizadores por accesibilidad (`getByRole`), alineados con las buenas prácticas de Playwright.
* Cada ejecución guarda una captura de pantalla de evidencia en `./evidencia/`.

Comando de ejecución:

```bash
npx playwright test ejercicio-bva-password --project=chromium
```

---

## 4. Resultado de la ejecución

**Resumen: 6 de 6 casos PASARON ✅ (distribución: 3 inválidos / 3 válidos).**

| ID | Caso | Esperado | Obtenido | Estado | Tiempo |
|------|-----------------------------------------|----------|----------|:------:|:------:|
| TC-01 | 1 char (muy por debajo)  | Inválida | Inválida | ✅ PASSED | 11.7s |
| TC-02 | 2 chars (por debajo)     | Inválida | Inválida | ✅ PASSED | 9.6s |
| TC-03 | 3 chars (L-1)            | Inválida | Inválida | ✅ PASSED | 8.4s |
| TC-04 | 4 chars (L, en el límite)| Válida   | Válida   | ✅ PASSED | 11.7s |
| TC-05 | 5 chars (L+1)            | Válida   | Válida   | ✅ PASSED | 7.8s |
| TC-06 | 10 chars (nominal alto)  | Válida   | Válida   | ✅ PASSED | 9.4s |

**Conclusión:** la regla "mínimo 4 caracteres" se comporta correctamente
en el límite inferior y en ambos lados de la frontera. No se detectaron defectos.

---

## 5. Evidencia gráfica (capturas de prueba)

### Casos inválidos (longitud < 4) — error visible y botón deshabilitado

**TC-01 · 1 carácter** — se muestra el mensaje de error y el botón *Sign Up* deshabilitado:
![TC-01 inválido 1 char](./evidencia/TC-01-invalido-1chars.png)

**TC-02 · 2 caracteres:**
![TC-02 inválido 2 chars](./evidencia/TC-02-invalido-2chars.png)

**TC-03 · 3 caracteres (L-1, valor límite inferior no válido):**
![TC-03 inválido 3 chars](./evidencia/TC-03-invalido-3chars.png)

### Casos válidos (longitud ≥ 4) — sin error y botón habilitado

**TC-04 · 4 caracteres (L, exactamente en el límite):**
![TC-04 válido 4 chars](./evidencia/TC-04-valido-4chars.png)

**TC-05 · 5 caracteres (L+1):**
![TC-05 válido 5 chars](./evidencia/TC-05-valido-5chars.png)

**TC-06 · 10 caracteres (nominal válido):**
![TC-06 válido 10 chars](./evidencia/TC-06-valido-10chars.png)

---

## 6. Estructura de la entrega

```
playwright-tests/ejercicio-bva-password/
├── bva-password.spec.ts        # Script de automatización (BVA data-driven)
├── INFORME-BVA.md              # Este informe de resumen de pruebas
└── evidencia/                  # Capturas de pantalla por caso de prueba
    ├── TC-01-invalido-1chars.png
    ├── TC-02-invalido-2chars.png
    ├── TC-03-invalido-3chars.png
    ├── TC-04-valido-4chars.png
    ├── TC-05-valido-5chars.png
    └── TC-06-valido-10chars.png
```
