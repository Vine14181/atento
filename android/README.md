# OFtento — app Android (Trusted Web Activity)

O app da Google Play (`atento.vgp`) é uma "janela" do Chrome para https://atento-tan.vercel.app.
Mudanças no site chegam ao app sem gerar versão nova; só é preciso um AAB novo quando
este projeto muda (manifesto, ícone, nome, biblioteca).

## Gerar o AAB para a Play

A chave de upload fica **fora do repositório** (`~/.local/share/oftento-play/upload-key.p12`)
e a senha, no chaveiro do GNOME (item "OFtento — chave de upload Play Console").

```bash
cd android
echo "sdk.dir=$HOME/Android/Sdk" > local.properties   # uma vez por máquina
export JAVA_HOME=$HOME/.local/jdk-21 DO_NOT_TRACK=1
export OFTENTO_KEYSTORE_PATH=$HOME/.local/share/oftento-play/upload-key.p12
export OFTENTO_KEY_ALIAS=oftento-upload
export OFTENTO_KEYSTORE_PASSWORD="$(secret-tool lookup application oftento purpose play-upload-key)"
./gradlew --no-daemon bundleRelease
# saída: app/build/outputs/bundle/release/app-release.aab
```

Antes de enviar: aumentar `versionCode` em `app/build.gradle` (a Play recusa número repetido).

## Por que existe cada peça

- `ManageDataLauncherActivity` no manifesto é **obrigatória**: a biblioteca a liga/desliga
  toda vez que o app abre; sem ela o app fecha na abertura (bug da versão 1).
- `OftentoLauncherActivity.startActivity` remove dois campos de métricas que a biblioteca
  manda para o Chrome.
- `asset_statements` + `/.well-known/assetlinks.json` no site: provam que app e site são do
  mesmo dono, para a TWA abrir sem barra de endereço.
