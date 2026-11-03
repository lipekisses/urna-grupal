# 🇧🇷 Simulador Oficial de Urna Eletrônica

Simulador completo e interativo da **Urna Eletrônica Brasileira**, desenvolvido com **React 19**, **TypeScript**, **Tailwind CSS v4** e **Web Audio API**.

O projeto replica fielmente o comportamento, a experiência sonora, os procedimentos e a apuração oficial de votos da Justiça Eleitoral brasileira.

---

## ✨ Principais Funcionalidades

### 1. 🗳️ Processo de Votação Completo
- **Dois cargos de votação**: Presidente (01) e Vice-presidente (02).
- **Voto Nominal**: Digite 2 números para ver a foto oficial, nome e partido do candidato.
- **Voto em Branco**: Tecla dedicada **BRANCO**.
- **Voto Nulo**: Número não cadastrado exibe aviso sonoro e visual de voto nulo.
- **Correção**: Tecla **CORRIGE** limpa os dígitos digitados para nova tentativa.
- **Confirmação**: Tecla **CONFIRMA** valida a escolha atual.

### 2. 🔊 Efeitos Sonoros Fidedignos (Web Audio API)
- **Bip de digitação**: Som curto ao teclar números ou botões de ação.
- **Bip de aviso/erro**: Alerta sonoro quando uma ação inválida é executada.
- **Bip intermediário**: Som de transição ao confirmar a primeira etapa (Presidente).
- **Som clássico "F I M" (TSE / Pililili)**: Reprodução fiel sintetizada em tempo real via Web Audio API (sem dependência de arquivos de áudio externos, funciona 100% offline).
- **Controle de Som**: Botão no topo para ativar ou desativar os sons a qualquer momento.

### 3. 🗣️ Acessibilidade & Audiodescrição
- **Síntese de voz em português**: Leitura automática do nome e chapa do candidato ao digitar o número.
- **Ponto tátil na tecla 5**: Representação do relevo tátil (Braille) existente nas urnas oficiais para eleitores com deficiência visual.
- **Atalhos de teclado completo**:
  - Números de `0` a `9`
  - `Enter`: Confirma
  - `Backspace`, `Delete` ou `Esc`: Corrige
  - Letra `B`: Voto em Branco

### 4. 📊 Boletim de Urna (B.U.) & Apuração em Tempo Real
- **Contagem persistente de votos**: Os votos de todos os eleitores são salvos localmente (`localStorage`).
- **Relatório de Apuração**:
  - Total de votos apurados.
  - Votos nominais e percentual de cada candidato com barras de progresso.
  - Indicação do vencedor / líder da eleição com destaque 🏆.
  - Total e percentual de votos em branco e nulos.
- **Impressão Oficial**: Botão para imprimir o Boletim de Urna estilizado como canhoto térmico da urna (`window.print()`).
- **Exportação JSON**: Download dos registros de auditoria em arquivo `.json`.
- **Zerar Urna**: Permite reiniciar a contagem para uma nova eleição.

### 5. 📜 Zerésima
- Emissão do relatório oficial de Zerésima comprovando que a urna iniciou com zero votos para todos os candidatos registrados.

### 6. ⚙️ Gerenciador de Chapas & Candidatos
- Adicionar novos candidatos com nome, número de 2 dígitos, cargo, partido/grupo e URL de foto.
- Remover candidatos existentes.
- **Chapas pré-configuradas em 1 clique**:
  - **Eleição Grupal (Padrão)**
  - **Grêmio Estudantil (Chapas Escolares)**
  - **Simulação Presidencial Oficial**

---

## 🚀 Como Executar

### Opção 1: Abrir diretamente no XAMPP (Apache)
Se a pasta estiver no seu `htdocs` (ex: `C:\xampp1\htdocs\urna-eletronica`):
1. Inicie o Apache no painel do XAMPP.
2. Acesse no navegador:
   ```
   http://localhost/urna-eletronica/dist/
   ```
   *(ou `http://localhost/urna-eletronica/` se a versão de produção estiver na raiz)*

### Opção 2: Modo Desenvolvimento (React + Vite)
Requer **Node.js**:
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```
Acesse o endereço exibido no terminal (geralmente `http://localhost:5173` ou `http://localhost:8443`).

### Opção 3: Gerar Build de Produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.

---

## 📂 Estrutura do Projeto

```
urna-eletronica/
├── dist/                          # Build de produção otimizado pronto para deploy
│   ├── assets/                    # Bundles CSS e JS
│   ├── favicon.svg
│   └── index.html
├── src/
│   ├── components/
│   │   ├── BoletimModal.tsx       # Modal do Boletim de Urna, Apuração e Zerésima
│   │   └── CandidateManagerModal.tsx # Gerenciador de Candidatos e Presets
│   ├── App.tsx                    # Componente principal da Urna Eletrônica
│   ├── candidates.ts              # Lista padrão e presets de candidatos
│   ├── index.css                  # Estilos globais e Tailwind v4
│   ├── main.tsx                   # Ponto de entrada React
│   ├── sound.ts                   # Motor de áudio Web Audio API (sons oficiais)
│   └── types.ts                   # Definições de tipos TypeScript
├── package.json                   # Dependências e scripts npm
├── tsconfig.json                  # Configuração TypeScript
└── vite.config.ts                 # Configuração do Vite
```

---

Desenvolvido para proporcionar uma experiência realista, educativa e moderna da urna eletrônica brasileira.
