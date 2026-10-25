import { test, expect } from '@playwright/test';

test.describe('Introducción a Playwright - Flujo Básico', () => {

    test('Debe permitir el inicio de sesión exitoso en la RealWorld App', async ({ page }) => {
        // 1. Navegar a la página de login, tomando la baseURL del config
        await page.goto('/signin');

        // 2. Interactuar con los elementos del formulario - Locators por accesibilidad
        await page.getByLabel('Username').fill('Katharina_Bernier');
        await page.getByLabel('Password').fill('s3cret');

        // 3. Hacer clic en el botón de ingreso
        await page.getByRole('button', { name: /sign in/i }).click();

        // 4. Verificación - Assert
        // Se confirma que el botón de "Nueva Transacción" sea visible en el Dashboard
        await expect(page.getByRole('link', { name: /new transaction/i })).toBeVisible();
    });

});
