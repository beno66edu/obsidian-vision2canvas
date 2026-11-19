# Vision2Canvas para Obsidian 🚀

> Converta fotos de anotações manuscritas físicas, esboços de quadro branco e mapas mentais em quadros brancos nativos e estruturados do Obsidian com Visão AI.

**README em Inglês** | [Documentação em Chinês Traduzido](file:///Users/user/projects/vision2obsidian/README_ZH.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Obsidian](https://img.shields.io/badge/Obsidian-v1.4.0%2B-purple)

---

## 📖 Visão Geral

**Vision2Canvas** preenche a lacuna entre o pensamento manuscrito analógico e as bases de conhecimento digitais do Obsidian. Usando Modelos de Linguagem Grandes Multimodais de Visão (Vision MLLMs, como Google AI Studio Gemini, OpenAI, Claude ou OpenClaw), este plugin do Obsidian não apenas extrai texto por OCR, mas também:
- **Preserva o Layout Espacial**: Mapeia seções manuscritas para coordenadas absolutas `(x, y)` e dimensões de cartão.
- **Traduz Conexões Visuais**: Converte setas, caminhos de fluxograma e caixas de grupo em `nodes`, `edges` e `groups` nativos do Canvas do Obsidian.
- **Fluxo de Trabalho Desktop**: Processa instantaneamente capturas de tela ou imagens do clipboard diretamente no seu cofre (vault).

---

## 🌟 Recursos Principais

1. **Mapeamento de Caixa Delimitadora Espacial**
   Mapeia colunas manuscritas, marcadores e notas de margem para nós do Canvas com espaçamento e categorização de cores apropriados.

2. **Detecção Inteligente de Setas e Hierarquia**
   Detecta automaticamente setas de conexão, rotula-as e as anexa aos lados de anexação ideais (`top`, `bottom`, `left`, `right`).

3. **API Compatível com OpenAI e Google AI Studio**
   Conecta-se perfeitamente ao Google AI Studio (Gemini), API da OpenAI ou gateways locais de MLLM.

4. **Gatilhos Desktop Multicanal**
   - **Comando do Clipboard**: Copie qualquer imagem ou captura de tela para o clipboard → `Convert Clipboard Image to Canvas`.
   - **Menu do Arquivo do Cofre**: Clique com o botão direito em qualquer imagem (`.png`, `.jpg`, `.jpeg`, `.webp`) no explorador de arquivos do Obsidian → `Convert to Obsidian Canvas Whiteboard`.

---

## 🏗 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Gatilhos de Entrada                                │
│           ┌─────────────────────┐       ┌───────────────┐               │
│           │ Captura de Tela do Clipboard│       │ Imagem do Cofre   │               │
│           └──────────┬──────────┘       └───────┬───────┘               │
└──────────────────────┼──────────────────────────┼───────────────────────┘
                       │                          │
                       ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Core do Plugin Vision2Canvas                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ VisionClient (API de Visão Compatível com Google AI Studio / OpenAI)   │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │ (OCR Espacial + Saída JSON Schema)│
│  ┌──────────────────────────────────▼────────────────────────────────┐  │
│  │ CanvasBuilder & CanvasValidator                                   │  │
│  │ - Normalização de Coordenadas (scaleX, scaleY)                       │  │
│  │ - Cálculo dos Lados de Conexão (top, bottom, left, right)             │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ Cofre do Obsidian (.canvas File) │
                      └───────────────────────────────┘
```

---

## 🚀 Início Rápido e Instalação

### 1. Construir e Instalar o Plugin

```bash
# Clone o repositório no diretório de plugins do seu cofre
cd /path/to/your/vault/.obsidian/plugins/
git clone https://github.com/yourname/vision2obsidian.git
cd vision2obsidian

# Instalar dependências e compilar o pacote
npm install
npm run build
```

Em seguida, no Obsidian: `Settings` → `Community Plugins` → Habilitar **Vision2Canvas**.

### 2. Configurar as Definições

No Obsidian `Settings` → `Vision2Canvas`:

Em **Connection Type**, escolha Google Gemini, OpenAI, Anthropic (Claude) ou OpenRouter. Informe a **API Key** do provedor. O campo **Vision Model Name** já vem preenchido e aceita o identificador de outro modelo com suporte a imagens. Cada provedor guarda sua própria chave e modelo.

Para o LM Studio, escolha **LM Studio (local)** e informe o identificador do modelo de visão instalado. Para outros servidores compatíveis com OpenAI, escolha **Custom (OpenAI compatible)** e informe a URL base e o modelo.

---

## 🧪 Teste e Verificação

Execute o script de teste independente incluído para testar a conversão de `ref/sample.jpeg` para `output_sample.canvas`:

```bash
npm run test:sample
```

Saída:
```
--- RESULTADOS DO TESTE ---
Gerados 15 nós e 4 arestas.
Salvo o canvas de saída em: /Users/user/projects/vision2obsidian/output_sample.canvas
```

---

## 📜 Licença

Licença MIT © 2026 beno66edu
