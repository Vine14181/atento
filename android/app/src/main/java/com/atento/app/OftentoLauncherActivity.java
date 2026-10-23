package com.atento.app;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Lançador TWA com os campos de métricas do navegador removidos antes do envio. */
public final class OftentoLauncherActivity extends LauncherActivity {
    // A biblioteca acrescenta estes dois valores (usados pelo Chrome só para métricas)
    // DEPOIS do gancho onPrepareIntent, então removê-los lá não tinha efeito. A TWA é
    // aberta por ContextCompat.startActivity(esta Activity, ...): este é o último ponto
    // em que o Intent passa pelo app antes de chegar ao navegador.
    private static final String EXTRA_STARTUP_UPTIME_MILLIS =
            "org.chromium.chrome.browser.customtabs.trusted.STARTUP_UPTIME_MILLIS";
    private static final String EXTRA_ANDROID_BROWSER_HELPER_VERSION =
            "org.chromium.chrome.browser.ANDROID_BROWSER_HELPER_VERSION";

    @Override
    public void startActivity(Intent intent, @Nullable Bundle options) {
        intent.removeExtra(EXTRA_STARTUP_UPTIME_MILLIS);
        intent.removeExtra(EXTRA_ANDROID_BROWSER_HELPER_VERSION);
        super.startActivity(intent, options);
    }
}
