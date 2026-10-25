import { test, expect, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

/**
 * EJERCICIO PRÁCTICO - Módulo de Registro de Usuarios
 * Regla a validar (análisis de valores límite / BVA):
 *   "La contraseña debe contener un mínimo de 4 caracteres."
 *
 * Fuente de la regla: src/components/SignUpForm.tsx
 *   password: string().min(4, "Password must contain at least 4 characters")
 *
 * Señales observables en UI:
 *   1) Mensaje de error inline (helperText): "Password must contain at least 4 characters"
 *   2) Estado del botón "Sign Up" (disabled cuando el formulario es inválido)
 */

const EVIDENCIA_DIR = path.join(__dirname, "evidencia");
const ERROR_MSG = "Password must contain at least 4 characters";

fs.mkdirSync(EVIDENCIA_DIR, { recursive: true });

interface Case {
  id: string;
  descripcion: string;
  password: string;
  esperadoValido: boolean;
}

// Tabla de datos BVA (límite inferior L = 4)
// Clases de equivalencia: inválida [0..3] | válida [4..n]
// Valores límite: L-1 = 3, L = 4, L+1 = 5  +  nominale a los extremos
const casos: Case[] = [
  { id: "TC-01", descripcion: "Muy por debajo del límite (1 char)",  password: "a",          esperadoValido: false },
  { id: "TC-02", descripcion: "Bajo el límite (2 chars)",            password: "ab",         esperadoValido: false },
  { id: "TC-03", descripcion: "Límite inferior menos 1 (L-1 = 3)",   password: "abc",        esperadoValido: false },
  { id: "TC-04", descripcion: "Exactamente en el límite (L = 4)",    password: "abcd",       esperadoValido: true  },
  { id: "TC-05", descripcion: "Límite inferior más 1 (L+1 = 5)",     password: "abcde",      esperadoValido: true  },
  { id: "TC-06", descripcion: "Nominal válido alto (10 chars)",      password: "abcd123456", esperadoValido: true  },
];

async function llenarFormulario(page: Page, password: string) {
  await page.goto("/signup");
  await expect(page.getByTestId("signup-title")).toBeVisible();

  await page.getByRole("textbox", { name: "First Name", exact: true }).fill("Maria");
  await page.getByRole("textbox", { name: "Last Name", exact: true }).fill("Lopez");
  await page.getByRole("textbox", { name: "Username", exact: true }).fill(`bva_${Date.now()}`);

  const pwd = page.getByRole("textbox", { name: "Password", exact: true });
  const confirm = page.getByRole("textbox", { name: "Confirm Password", exact: true });

  await pwd.fill(password);
  await confirm.fill(password);

  // Fuerza 'touched' en Password para que Formik renderice el helperText
  await confirm.blur();
  await pwd.click();
  await confirm.click();
}

async function evidencia(page: Page, nombre: string) {
  await page.screenshot({ path: path.join(EVIDENCIA_DIR, nombre), fullPage: true });
}

test.describe("BVA - Campo Contraseña (mínimo 4 caracteres) en Sign Up", () => {
  for (const c of casos) {
    test(`${c.id} - ${c.descripcion}`, async ({ page }) => {
      await llenarFormulario(page, c.password);

      const errorMsgVisible = page.getByText(ERROR_MSG, { exact: true });
      const botonSignUp = page.getByTestId("signup-submit");

      if (c.esperadoValido) {
        // VÁLIDO: no debe aparecer el error y el botón debe estar habilitado
        await expect(errorMsgVisible).toBeHidden();
        await expect(botonSignUp).toBeEnabled();
        await evidencia(page, `${c.id}-valido-${c.password.length}chars.png`);
      } else {
        // INVÁLIDO: debe aparecer el mensaje de error y el botón deshabilitado
        await expect(errorMsgVisible).toBeVisible();
        await expect(botonSignUp).toBeDisabled();
        await evidencia(page, `${c.id}-invalido-${c.password.length}chars.png`);
      }
    });
  }
});
