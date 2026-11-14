# Automatizador PRO

Site estático em português do Brasil. O código do site fica em `public/`. As páginas usam HTML, CSS e JavaScript locais e o projeto não tem dependências npm.

## Executar no Windows

Com Node.js 22 ou superior:

```powershell
npm.cmd run dev
```

Abra http://127.0.0.1:4173/. Para verificar os arquivos gerados:

```powershell
npm.cmd run build
npm.cmd run preview
```

Encerre o servidor com Ctrl+C. A variável `PORT` permite escolher outra porta de prévia.

## Publicação na Vercel

1. Envie o código-fonte deste site ao GitHub, em um repositório separado do aplicativo desktop. Inclua public/, scripts/, package.json, vercel.json, .gitignore e README.md. A pasta dist/ é gerada no build e fica fora do repositório.
2. Ao autorizar a publicação, importe o projeto na Vercel como **Other**. Selecione a raiz do repositório e o Node.js 22 ou superior. O arquivo `vercel.json` configura npm run build, a saída dist e os cabeçalhos.
3. Defina `SITE_URL` com a origem HTTPS do domínio confirmado. O build gera as URLs canônicas, Open Graph com URL absoluta e sitemap das páginas públicas. A página Stream Deck usa `noindex` e fica fora do sitemap.
4. Antes da publicação, complete a identificação do controlador e revise as bases legais, os provedores, eventuais transferências internacionais e a retenção conforme a operação real. O botão Solicitar acesso direciona ao e-mail informado, enquanto a distribuição do instalador aguarda confirmação.

Se o repositório publicado usa somente o conteúdo gerado de dist/, execute o build primeiro e envie as alterações desse repositório. O build inclui um vercel.json com os mesmos cabeçalhos para essa modalidade estática.

## Stream Deck

O simulador de economia calcula estimativas no navegador. Na conexão integrada, o navegador consulta o PC diretamente. O endereço, PIN, estado e comandos ficam no navegador e na rede local. O PIN é enviado como Bearer ao endereço local indicado e mantido apenas em memória. Use uma rede confiável, pois o servidor do app usa HTTP.

No desktop atualizado, abra **Configurações → Celular**. Em **Domínio HTTPS do site**, informe a origem exibida em /stream-deck/ (por exemplo, https://meu-site.vercel.app, sem caminho). Preencha **Nome do PC no Stream Deck** se quiser identificar a máquina após conectar. Ligue o painel. No site, com o celular e o PC na mesma rede, informe o IP e a porta do app, digite o PIN e permita o acesso à rede local quando o navegador solicitar. O painel permanece no domínio do site. Use uma versão atual do Chrome que permita a conexão local. 127.0.0.1 serve para testes no próprio computador. Para validar a prévia local, o app também aceita uma origem HTTP explícita em localhost ou 127.0.0.1.

A página usa GET /api/state e POST /api/command. A resposta HTTP 202 confirma o recebimento, e a atualização de estado confirma a execução. A CSP libera conexões HTTP somente na página Stream Deck, enquanto o JavaScript restringe o destino a IPv4 local com porta explícita. A Vercel serve arquivos estáticos. A página não usa um proxy nem disponibiliza controle pela internet.

A marca SVG foi redesenhada a partir das coordenadas do desenho oficial em `ui/brand.py`. O guia usa as capturas do editor e do catálogo fornecidas para o site. As simulações usam dados de exemplo.

## Indexação e métricas

O build usa SITE_URL ou VERCEL_PROJECT_PRODUCTION_URL para gerar sitemap, feed RSS, canonical e alternates. Defina GA4_MEASUREMENT_ID para mostrar as opções de consentimento na página inicial. Configure GOOGLE_SITE_VERIFICATION e BING_SITE_VERIFICATION com os códigos das contas e confirme a propriedade nos painéis respectivos. O build inclui páginas de erro estáticas. A prévia serve 404 e 500 quando apropriado. A resposta de erros de infraestrutura e a compressão em produção são gerenciadas pela hospedagem.
