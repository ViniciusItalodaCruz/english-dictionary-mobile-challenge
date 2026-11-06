# English Dictionary — Mobile Challenge

Aplicativo móvel para consultar palavras em inglês, ver fonética e significados, ouvir a pronúncia quando a API fornece áudio e manter favoritos e histórico por usuário autenticado.

A solução foi desenvolvida como entrega do desafio técnico da Coodesh. O objetivo é demonstrar listagem paginada, detalhe da palavra, cache de requisições e persistência de favoritos e histórico associados ao usuário. Não é um produto comercial nem uma aplicação em produção.

> This is a challenge by [Coodesh](https://coodesh.com/).

## Sumário

- [Apresentação](#apresentação)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Decisões arquiteturais](#decisões-arquiteturais)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Integrações externas](#integrações-externas)
- [Estratégia de cache e performance](#estratégia-de-cache-e-performance)
- [Segurança e autenticação](#segurança-e-autenticação)
- [Requisitos do desafio](#requisitos-do-desafio)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Configuração do Supabase](#configuração-do-supabase)
- [Testes e qualidade](#testes-e-qualidade)
- [Decisões técnicas e trade-offs](#decisões-técnicas-e-trade-offs)
- [Limitações conhecidas](#limitações-conhecidas)
- [Créditos](#créditos)

## Apresentação

O aplicativo abre em uma tela de login. Depois da autenticação, a Home reúne três abas: lista de palavras, histórico e favoritos. A lista é uma grade de três colunas com rolagem infinita. Cada palavra abre uma tela de detalhe com fonética, áudio, significados e os botões Voltar e Próximo.

A Free Dictionary API não oferece a lista de palavras. Essa lista é lida da tabela `words` no Supabase. O detalhe de cada palavra é consultado em `https://api.dictionaryapi.dev`. Favoritos e histórico ficam no PostgreSQL do Supabase e são associados ao `id` do usuário autenticado.

O `app.json` configura iOS, Android e web, orientação retrato e o scheme `freedictionaryapichallenger`. O nome interno do projeto é `english-dictionary-mobile-challenge
`, versão `1.0.0`. Login, áudio e armazenamento seguro dependem de módulos nativos do Expo. Este documento não registra validação manual em dispositivo, simulador ou navegador.

Funcionalidades principais:

- Login com e-mail e senha, sessão persistida e logout.
- Lista de palavras em grade, com paginação e rolagem infinita.
- Detalhe com fonética, classe gramatical, definição e exemplo.
- Pronúncia quando a API devolve uma URL de áudio.
- Favoritar e desfavoritar.
- Histórico das palavras abertas, com listagem e remoção.
- Estados de carregamento, erro e vazio.

## Tecnologias utilizadas

As versões abaixo são as instaladas em `node_modules` e registradas no `package-lock.json`. O `package.json` declara intervalo em parte dos pacotes. Onde o intervalo e a versão instalada diferem, a diferença está indicada.

| Tecnologia                   | Versão          | Responsabilidade                                              |
| ---------------------------- | --------------- | ------------------------------------------------------------- |
| React                        | 19.3.0          | Biblioteca de interface                                       |
| React Native                 | 0.88.1          | Desenvolvimento mobile                                        |
| Expo                         | 58.0.23         | Infraestrutura, módulos nativos e execução                    |
| Expo Router                  | 58.0.30         | Navegação baseada em arquivos                                 |
| TypeScript                   | 6.0.3           | Tipagem estática                                              |
| NativeWind                   | 4.2.7           | Estilização utilitária sobre Tailwind CSS                     |
| Tailwind CSS                 | 3.4.19          | Preset e processamento das classes                            |
| Zustand                      | 5.0.16          | Estado global da sessão                                       |
| TanStack Query               | 5.106.1         | Estado assíncrono, cache e paginação                          |
| Axios                        | 1.21.0          | Comunicação HTTP                                              |
| Supabase                     | serviço externo | Autenticação e PostgreSQL via REST                            |
| `@supabase/supabase-js`      | 2.119.0         | Pacote instalado; o código da aplicação não o importa         |
| expo-secure-store            | 58.0.2          | Persistência da sessão                                        |
| AsyncStorage                 | 2.2.0           | Identificador local de instalação                             |
| React Hook Form              | 7.91.0          | Estado do formulário de login                                 |
| Zod                          | 4.6.7           | Validação do formulário                                       |
| `@hookform/resolvers`        | 7.0.3           | Liga o schema Zod ao React Hook Form                          |
| Jest                         | 30.5.2          | Testes automatizados. O `package.json` declara `^30`          |
| jest-expo                    | 58.0.14         | Preset de teste do Expo                                       |
| React Native Testing Library | 14.1.0          | Testes de hooks e componentes. O `package.json` declara `^14` |
| expo-audio                   | 58.0.11         | Reprodução da pronúncia                                       |

O ambiente mínimo declarado em `package.json` e reforçado por `.npmrc` (`engine-strict=true`) é Node.js `>=24.15.0` e npm `>=11.12.1`. O arquivo `.nvmrc` fixa Node.js `24.15.0`. Não há versão de projeto Supabase hospedado neste repositório.

## Decisões arquiteturais

A rota compõe a tela. O service conversa com a API. O hook concentra carregamento, erro, cache e ações. O componente permanece declarativo. O alias `@/*` aponta para `src/*`.

### Zustand

O Zustand guarda apenas o estado de autenticação no cliente: sessão, status e as ações de restaurar, concluir o login, obter um access token válido e encerrar a sessão.

O status assume três valores: `loading`, `authenticated` e `unauthenticated`. Não existe um segundo flag `isLoading`. A inicialização começa em `loading`.

Esse estado é compartilhado por layouts, services e hooks sem precisar descer por props. A sessão é pequena, síncrona para leitura e independente do cache remoto. O store não acessa o SecureStore diretamente. A leitura e a gravação ficam em `session-storage`.

### TanStack Query v5

O TanStack Query guarda o resultado das requisições. Um único `QUERY_CLIENT` envolve a árvore em `src/app/_layout.tsx`.

O client padrão usa:

- `staleTime` de 5 minutos;
- `retry: false`;
- `refetchOnWindowFocus: false`.

O `gcTime` não é customizado.

Uso concreto:

- `useQuery` busca o detalhe da palavra e o status de favorito.
- `useInfiniteQuery` pagina a lista geral, o histórico e os favoritos.
- `isPending`, `isError`, `isFetchingNextPage` e listas vazias alimentam loading, erro e empty state.
- `useMutation` grava ou remove histórico e favoritos.
- Depois de uma mutação bem-sucedida, `invalidateQueries` atualiza as consultas do mesmo usuário.
- A lista geral e o detalhe da palavra usam chaves públicas. Histórico, favoritos e status de favorito usam o prefixo `user` seguido do `userId`.
- No logout e antes de gravar uma nova sessão, as queries com prefixo `user` são canceladas e removidas. Um listener descarta query privada cujo `userId` não seja o da sessão atual.

Zustand e TanStack Query resolvem problemas diferentes. O primeiro descreve quem está autenticado. O segundo descreve o que foi buscado no servidor e por quanto tempo esse resultado pode ser reutilizado.

### Axios

Há dois papéis de cliente, com uma ressalva importante sobre qual deles as telas usam.

O cliente compartilhado em `src/shared/utils/axios.ts` aponta para `${EXPO_PUBLIC_SUPABASE_URL}/rest/v1`, tem timeout de 15 segundos e envia `apikey` e `Content-Type`. A importação desse módulo falha se a URL ou a publishable key não existirem. Ele atende:

- `GET /words`, sem `Authorization`;
- `POST /auth/v1/token?grant_type=password` e `POST /auth/v1/logout`, usando a URL absoluta de autenticação;
- histórico e favoritos, com `Authorization: Bearer` montado em cada service.

`getAuthenticatedApi()` cria outro cliente Axios para o mesmo REST, exige um access token válido antes do envio, recusa mandar credencial para um host que não seja o Supabase e, em HTTP 401 vindo do Supabase, encerra a sessão. Os services de lista, histórico, favoritos, login e logout não chamam esse cliente. Ele existe e está coberto por teste, mas não é o caminho usado pelas telas.

A Free Dictionary API é chamada com `axios.get` direto, sem `apikey` e sem access token.

### Expo e Expo Router

O Expo fornece o bundler, os módulos nativos e os scripts de execução. O Babel usa `babel-preset-expo` com NativeWind. O Metro aplica `withNativeWind` sobre `src/global.css`. O `app.json` habilita os experimentos `typedRoutes` e `reactCompiler`.

As rotas ficam em `src/app`:

- `sign-in.tsx` é a rota pública;
- o grupo `(app)` contém a Home e `/words/[word]`;
- o layout desse grupo só renderiza o `Stack` quando o status é `authenticated` e a sessão não está expirada. Nos outros casos, redireciona para `/sign-in`.

Enquanto o status é `loading`, o `AuthGate` mostra um indicador e não monta as rotas. A proteção implementada usa `Redirect` e o status do Zustand.

### NativeWind

As telas usam classes Tailwind por meio do NativeWind 4. `tailwind.config.js` lê `./src/**/*.{ts,tsx}` e o preset do NativeWind. `cn()` combina `clsx` e `tailwind-merge` para compor classes sem conflito.

Botão, campo, abas e as listas reutilizam esse vocabulário visual. A interface implementada é escura, com superfícies `zinc` e texto claro. O `userInterfaceStyle` do Expo está em `automatic`, e não há troca de tema no código.

### React Hook Form e Zod

O login usa React Hook Form com `zodResolver`. O schema exige e-mail válido e senha com pelo menos um caractere. O botão permanece desabilitado enquanto o formulário é inválido ou o envio está em andamento. A mensagem de erro da API some depois de 8 segundos.

### Supabase

O Supabase é o backend do desafio: Auth para e-mail e senha, e PostgreSQL, acessado pelo PostgREST, para palavras, histórico e favoritos.

O login não usa `@supabase/supabase-js`. O service envia e-mail e senha para `POST /auth/v1/token?grant_type=password`. A resposta só vira sessão quando contém access token, usuário com `id` e `email`, e uma expiração utilizável. O `refresh_token` da resposta é ignorado e não é gravado.

Histórico e favoritos viajam com o access token do usuário. A publishable key identifica o projeto. A `service_role` não entra no cliente.

### Jest e React Native Testing Library

Os testes são unitários e de componente, com Jest, o preset `jest-expo` e React Native Testing Library. Não há suíte E2E, Detox, Maestro ou equivalente.

`jest.setup.ts` fixa variáveis de teste e substitui Axios, SecureStore, AsyncStorage e `expo-audio`. Os arquivos em `__tests__` cobrem services, hooks, componentes, sessão, cache e a tela de detalhe. Essa abordagem verifica contrato, estado e apresentação sem depender de dispositivo nem do Supabase real.

## Estrutura de diretórios

```text
.
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── screens/
│   ├── services/
│   └── utils/
├── assets/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── (app)/
│   │       ├── _layout.tsx
│   │       ├── index.tsx
│   │       └── words/[word].tsx
│   ├── modules/
│   │   ├── authentication/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   └── util/
│   │   ├── details/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── home/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── services/
│   ├── shared/
│   │   ├── components/
│   │   └── utils/
│   └── global.css
├── app.json
├── babel.config.js
├── metro.config.js
├── jest.config.cjs
├── jest.setup.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── package-lock.json
```

Não há pasta `types` nem `contexts`. Os tipos ficam ao lado dos services que os usam. Em autenticação, a pasta de apoio se chama `util`; em detalhes, `utils`.

Responsabilidades:

- `src/app` declara as rotas e compõe as telas. A Home alterna as três abas em estado local.
- `src/modules/authentication` trata formulário, sessão, SecureStore, logout e o escopo das queries privadas.
- `src/modules/home` trata a lista geral, o histórico e os favoritos, inclusive a remoção.
- `src/modules/details` trata a consulta à Dictionary API, a apresentação, o áudio, o favorito da palavra aberta e a navegação Voltar/Próximo.
- `src/shared` reúne botão, input, abas, o cliente Axios, o QueryClient, `cn()` e a leitura de inteiros da rota.

Dentro de cada módulo, `components` renderiza, `hooks` orquestra estado e efeitos, `services` acessa HTTP e `stores` existe somente na autenticação.

## Funcionalidades implementadas

### Autenticação

O formulário pede e-mail e senha. A validação ocorre antes do envio. Credencial rejeitada com `error_code` `invalid_credentials` mostra "Invalid email or password.". HTTP 429 mostra pedido para tentar mais tarde. As demais falhas Axios e as falhas locais usam uma mensagem genérica.

A sessão só é considerada concluída depois que o SecureStore confirma a gravação. Se o armazenamento seguro não estiver disponível, ou se a gravação falhar, o status permanece `unauthenticated` e a navegação não segue para a Home.

A sessão guardada contém access token, `expiresAt` em segundos, `id` e `email`. Senha e refresh token não entram nesse JSON. A chave é `dictionary.auth.session`.

Um formato antigo, com chaves separadas de access token, refresh token e metadados, é apagado na leitura. Um JSON que ainda traga refresh token também é descartado.

O grupo `(app)` fica inacessível sem sessão válida. Sessão expirada é removida e a tela de login volta. O botão Sign out encerra a sessão local, limpa o cache privado e tenta revogar o token no Supabase. Falha de rede nessa revogação não restaura o usuário.

Não há tela de cadastro, recuperação de senha nem renovação de token.

### Home

A aba Word list lê `GET /words` em ordem `word.asc`. Cada página pede 100 itens e mais um, para saber se existe próxima página sem uma consulta de contagem. A rolagem usa `FlatList` com três colunas e `onEndReached`.

A primeira carga mostra indicador. Lista vazia mostra "No words found.". Falha na primeira página ou na página seguinte oferece nova tentativa. A query só fica habilitada enquanto a aba está selecionada. Os parâmetros opcionais de rota `page` e `pageSize` alteram a página inicial e o tamanho, com teto de 100. A interface não expõe controle para esses parâmetros.

Tocar em uma palavra abre `/words/[word]` com `source=word-list`.

### Detalhes

A tela consulta a Free Dictionary API pela palavra normalizada em minúsculas. A resposta é cacheada em `["word-details", palavra]`.

Quando o conteúdo existe, a tela mostra:

- a palavra;
- a fonética de `phonetic` ou, na ausência dela, o primeiro `phonetics[].text`;
- o player, se houver URL de áudio;
- os significados agrupados por `partOfSpeech`, com definição e exemplo quando o exemplo existe.

HTTP 404 da API aparece como "Word not found." e oferece retry. Resposta vazia aparece como ausência de definições. Sinônimos, antônimos e origem podem vir na resposta e estão tipados no service. A tela não os renderiza.

O X chama `router.back()`. Voltar e Próximo chamam `router.setParams` com a palavra vizinha e o mesmo `source`. Por isso o X continua fechando a tela, em vez de desfazer cada palavra visitada.

A vizinhança vem das páginas já presentes no cache da lista de origem: `word-list`, `history` ou `favorites`. Sem `source`, ou quando a palavra não está nessas páginas, os dois botões ficam desabilitados. A próxima página não é buscada apenas para habilitar o botão. Trocar de palavra grava o histórico, atualiza o favorito e recria o player.

### Histórico

Abrir uma palavra, inclusive por Voltar ou Próximo, envia um upsert para `word_history`. O corpo leva `user_id`, `word` e `last_viewed_at`. O header `Prefer: resolution=merge-duplicates` e o parâmetro `on_conflict=user_id,word` atualizam a visualização anterior da mesma palavra.

A aba History lista `user_id`, `word` e `last_viewed_at`, da visualização mais recente para a mais antiga, em páginas de 20 itens. A lista também rola de forma infinita. Cada item abre o detalhe com `source=history` e pode ser removido. A remoção filtra `user_id` e `word`.

A consulta da lista não envia filtro de `user_id`. A separação entre usuários depende de RLS no Supabase.

### Favoritos

Na tela de detalhe, a estrela consulta se a palavra já está em `favorites` para o usuário atual. Adicionar envia `POST /favorites` com o corpo `{ word }`, `Prefer: resolution=ignore-duplicates` e `on_conflict=user_id,word`. O cliente não envia `user_id` nesse insert. Remover envia `DELETE /favorites` filtrando `user_id` e `word`.

A aba Favorites lista `user_id`, `word` e `created_at`, do mais recente para o mais antigo, em páginas de 20. Também oferece rolagem infinita, abertura do detalhe com `source=favorites` e remoção.

Depois de adicionar ou remover, as queries de favoritos daquele `userId` são invalidadas. A lista e a estrela passam a refletir o servidor. Não há atualização otimista do cache.

Como na listagem de histórico, a listagem de favoritos não filtra `user_id` na query. A consulta de status e a exclusão filtram.

## Integrações externas

### Free Dictionary API

O detalhe usa:

```http
GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

A palavra é codificada com `encodeURIComponent`. A chamada não recebe token do Supabase.

Campos usados pela interface:

| Campo                                 | Uso                                                         |
| ------------------------------------- | ----------------------------------------------------------- |
| `word`                                | Título. Se ausente na entrada, a tela usa a palavra da rota |
| `phonetic` e `phonetics[].text`       | Fonética                                                    |
| `phonetics[].audio`                   | Primeira URL não vazia alimenta o player                    |
| `meanings[].partOfSpeech`             | Classe gramatical                                           |
| `meanings[].definitions[].definition` | Definição                                                   |
| `meanings[].definitions[].example`    | Exemplo, apenas quando presente                             |

Fonética, áudio e exemplo são opcionais. O resultado fica no cache do TanStack Query pela palavra normalizada e segue o `staleTime` de 5 minutos do client.

### Supabase

O cliente usa duas variáveis públicas e a API REST. Não há SDK no fluxo.

Autenticação:

```http
POST {EXPO_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password
POST {EXPO_PUBLIC_SUPABASE_URL}/auth/v1/logout
```

Dados, na base `{EXPO_PUBLIC_SUPABASE_URL}/rest/v1`:

| Tabela         | Operações do app                   | Campos observados                   |
| -------------- | ---------------------------------- | ----------------------------------- |
| `words`        | `GET`, somente com `apikey`        | `word`                              |
| `word_history` | `GET`, `POST`, `DELETE` com Bearer | `user_id`, `word`, `last_viewed_at` |
| `favorites`    | `GET`, `POST`, `DELETE` com Bearer | `user_id`, `word`, `created_at`     |

O `POST` de favorito envia somente `word`. Para a listagem conseguir ler `user_id` e `created_at`, o banco precisa preencher esses campos na inserção autenticada.

As listagens privadas não filtram usuário. RLS é necessário para que cada access token veja apenas as próprias linhas. A proteção de rota no aplicativo não substitui essa política. A tabela `words` precisa ser legível com a publishable key, porque a lista não envia Bearer.

O repositório não contém migrations, policies nem script SQL.

### Origem da lista de palavras

O desafio pede o conjunto `words_dictionary.json` do repositório [dwyl/english-words](https://github.com/dwyl/english-words/blob/master/words_dictionary.json). Esse arquivo não está neste projeto e não existe script de importação ou seed.

A Home lê a tabela `words` já existente no Supabase, em ordem alfabética. O banco não é populado automaticamente. Sem linhas nessa tabela, a lista fica vazia.

## Estratégia de cache e performance

O TanStack Query evita repetir uma busca enquanto o resultado ainda está fresco. O detalhe de uma palavra já visitada é reutilizado pela chave `["word-details", palavra]`, inclusive quando a mesma palavra é aberta a partir de outra aba.

A paginação infinita está em três consultas:

| Consulta    | Chave                                      | Página        |
| ----------- | ------------------------------------------ | ------------- |
| Lista geral | `["word-list", { initialPage, pageSize }]` | 100, teto 100 |
| Histórico   | `["user", userId, "word-history"]`         | 20            |
| Favoritos   | `["user", userId, "word-favorites"]`       | 20            |

O status de uma palavra usa `["user", userId, "word-favorites", word]`. Invalidar o prefixo `word-favorites` daquele usuário atualiza a lista e a estrela.

As mutações não tentam de novo. Uma mutação só invalida o cache se a sessão ainda pertence ao mesmo usuário que iniciou a operação. No logout, as queries privadas em andamento são canceladas e as chaves que começam com `user` são removidas. A lista geral e os detalhes da Dictionary API permanecem, porque não carregam dado do usuário.

As listas usam `FlatList`. A grade configura `initialNumToRender` 24, `maxToRenderPerBatch` 24, `windowSize` 7 e `onEndReachedThreshold` 0.4. Histórico e favoritos usam 12, 12, 5 e 0.5. A próxima página só é pedida quando já existem itens, há próxima página e não há carga ou erro em andamento. Histórico e favoritos só disparam a query com a aba ativa.

Não há métrica de desempenho medida neste repositório.

## Segurança e autenticação

O login usa Supabase Auth pela REST e a publishable key. O access token resultante é a credencial das chamadas privadas.

A persistência usa o SecureStore com `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. No iOS, essa opção define a acessibilidade do Keychain. As escritas passam por uma fila e por uma geração. Cada login ou logout incrementa a geração. Uma gravação antiga que termina depois não restaura a sessão, e um logout não apaga uma sessão mais nova.

Um identificador de instalação, sem token e sem senha, fica no AsyncStorage (`dictionary.auth.install-id`) e também dentro do JSON seguro. Se os dois não coincidirem, a sessão armazenada é apagada. Isso cobre o caso em que o armazenamento seguro sobrevive a uma reinstalação e o AsyncStorage não.

A sessão é tratada como expirada quando `Date.now() >= expiresAt * 1000`. `expiresAt` vem de `expires_at`. Valor em milissegundos é convertido para segundos. Se `expires_at` não vier, a expiração é calculada com `expires_in`. Essa verificação ocorre:

- ao abrir o app e ler o SecureStore;
- antes de cada chamada que precisa do access token;
- quando o app volta para o primeiro plano;
- por um timer local até o horário de expiração.

O timer apenas antecipa o mesmo encerramento. Ele não é o único mecanismo, porque o sistema pode suspender timers em segundo plano.

O cliente `getAuthenticatedApi()` encerra a sessão em HTTP 401 do próprio Supabase e não envia o token para outro host. As telas atuais não passam por esse cliente. Nelas, o token é conferido antes do envio. Um HTTP 401 devolvido pelo cliente compartilhado não passa pelo interceptor e, sozinho, não encerra a sessão. HTTP 401 da Dictionary API também não encerra a sessão do Supabase.

O refresh token foi deixado de fora de propósito. O diferencial do desafio pede login e a associação de favoritos e histórico ao usuário. Não pede renovação automática. Quando o access token expira, a sessão local termina e o usuário entra novamente. Essa é uma decisão deste challenge, não um modelo de sessão para aplicação em produção.

O logout zera a sessão em memória antes da rede, limpa o cache privado, apaga o SecureStore e então tenta `POST /auth/v1/logout` com timeout de 5 segundos.

As variáveis `EXPO_PUBLIC_*` são incorporadas ao bundle do cliente. A `service_role` e qualquer segredo de servidor não podem ser colocados nelas.

## Requisitos do desafio

### Obrigatórios

| Requisito                              | Status   | Implementação                                                                                                                                                                   |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lista de palavras com rolagem infinita | Atendido | Grade de três colunas, `useInfiniteQuery` e `GET /words`                                                                                                                        |
| Detalhes, significados e fonética      | Atendido | Free Dictionary API, com classe gramatical, definição, exemplo e fonética quando existirem                                                                                      |
| Adicionar aos favoritos                | Atendido | `POST /favorites` a partir da estrela                                                                                                                                           |
| Remover dos favoritos                  | Atendido | `DELETE /favorites` na estrela e na lista                                                                                                                                       |
| Histórico de palavras visualizadas     | Atendido | Upsert ao abrir a palavra, lista paginada e remoção                                                                                                                             |
| Cache de requisições                   | Atendido | TanStack Query, com reutilização por chave e `staleTime` de 5 minutos                                                                                                           |
| Interface baseada no wireframe         | Atendido | Abas Word list, History e Favorites, grade de três colunas e detalhe com fechar, palavra, fonética, áudio, significados, Voltar e Próximo. O desafio permite reposicionar itens |

### Diferenciais

| Requisito                                 | Status           | Implementação                                                                                            |
| ----------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Reprodução de áudio                       | Atendido         | `expo-audio` com a URL devolvida pela Dictionary API                                                     |
| Injeção de dependência                    | Não implementado | Não há container, decorators nem biblioteca de DI. Os módulos se compõem por import direto               |
| Testes unitários ou E2E                   | Atendido         | Jest e React Native Testing Library. Não há E2E                                                          |
| Autenticação com persistência por usuário | Atendido         | Login com e-mail e senha, sessão no SecureStore, histórico e favoritos associados ao usuário no Supabase |

## Pré-requisitos

- Node.js `>=24.15.0`. O `.nvmrc` pede `24.15.0`.
- npm `>=11.12.1`. O `.npmrc` ativa `engine-strict`.
- Os campos `engines.yarn`, `engines.pnpm` e `engines.bun` pedem o uso de npm.
- Um projeto Supabase com Auth e as tabelas descritas mais abaixo.
- Para Android ou iOS, um runtime Expo compatível com o SDK 58. O repositório não fixa versão de Android SDK nem de Xcode, e não versiona as pastas `ios/` e `android/`.
- Para abrir emulador ou simulador local, o toolchain nativo correspondente precisa estar instalado.

O projeto não inclui `expo-dev-client` nem módulo nativo fora do SDK. Os plugins registrados são `expo-router`, `expo-splash-screen`, `expo-secure-store` e `expo-audio`. A execução depende de um runtime desse SDK. Este README não afirma compatibilidade validada com uma build específica do Expo Go.

No web, o `app.json` usa Metro com `output: server` e existe o script `npm run web`. Se `SecureStore.isAvailableAsync()` for falso, o login não grava a sessão e não entra na Home. Esta documentação não trata o web como plataforma validada.

## Instalação e execução

```bash
git clone https://github.com/ViniciusItalodaCruz/english-dictionary-mobile-challenge
.git
cd english-dictionary-mobile-challenge

npm ci
```

`npm ci` é o caminho de instalação porque o `package-lock.json` existe. Em seguida, crie o `.env` como descrito na próxima seção e prepare o Supabase antes de abrir a Home.

```bash
npm start
```

`npm start` executa `expo start` e sobe o Metro. Esse comando ainda não instala o aplicativo em um dispositivo.

```bash
npm run android
npm run ios
npm run web
```

Esses scripts executam `expo start --android`, `expo start --ios` e `expo start --web`. Eles pedem a abertura do projeto na plataforma correspondente, desde que o runtime e o toolchain existam.

`npm run reset-project` pertence ao template do Expo. Ele move o `src` atual para fora do app. Não faz parte da execução do dicionário.

## Variáveis de ambiente

O código lê duas variáveis:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Não há `.env.example` no repositório. Crie um arquivo `.env` na raiz com a URL do projeto, no formato `https://PROJECT.supabase.co`, e a publishable key desse projeto.

As duas são obrigatórias. O cliente Axios interrompe a inicialização quando uma delas falta. Valores `EXPO_PUBLIC_*` entram no bundle do cliente. Use somente a publishable key. Não coloque a secret key nem a `service_role`.

O `.gitignore` ignora `.env*.local` e não ignora `.env`. O arquivo `.env` também está versionado no estado atual do repositório. Não acrescente segredo a esse arquivo. Se a cópia versionada contiver uma key real, ela deve ser revogada no painel do Supabase e substituída por outra.

Os testes definem valores fictícios em `jest.setup.ts` quando as variáveis não existem. Esses valores não autenticam em um projeto real.

## Configuração do Supabase

O repositório não cria o banco. Antes de usar o aplicativo, o projeto Supabase precisa ser preparado manualmente.

1. Crie um projeto e copie a URL e a publishable key para o `.env`.
2. Crie um usuário de e-mail e senha no Auth. O app não possui cadastro.
3. Crie e popule a tabela `words` com a coluna `word`. A lista pede `select=word&order=word.asc` e precisa ser legível com a publishable key. A origem esperada dos termos é `words_dictionary.json`, importado fora deste repositório.
4. Crie `word_history` com `user_id`, `word` e `last_viewed_at`. O upsert do app envia `on_conflict=user_id,word` e depende de uma restrição única correspondente para o PostgREST aplicar o merge.
5. Crie `favorites` com `user_id`, `word` e `created_at`. O insert envia apenas `word`; o banco precisa gravar o usuário autenticado e a data. O conflito informado também é `user_id,word`.
6. Ative RLS em `word_history` e `favorites` para restringir leitura e escrita ao `id` do access token. As listagens não enviam filtro de usuário.

Não há SQL versionado para reproduzir essas tabelas, políticas ou a carga das palavras. Sem esse preparo, login, lista, histórico ou favoritos falham conforme a permissão ausente.

## Testes e qualidade

```bash
npm test
npm run test:coverage
npm run test:ci
npm run typecheck
```

- `npm test` executa Jest.
- `npm run test:coverage` gera cobertura em `coverage/`.
- `npm run test:ci` executa Jest em CI, com cobertura e `--runInBand`.
- `npm run typecheck` executa `tsc --noEmit`. O `tsconfig.json` estende `expo/tsconfig.base` e liga `strict`.

O Jest usa `clearMocks`, procura `*.test` e `*.spec`, e coleta cobertura de `src/**/*.{ts,tsx}`. O setup simula as fronteiras nativas e o Axios.

A suíte cobre, entre outros pontos:

- login, mapeamento da sessão, SecureStore, ciclo de vida e logout;
- o cliente autenticado, inclusive recusa de credencial para host externo e HTTP 401;
- services de lista, histórico, favoritos e Dictionary API;
- hooks de paginação, mutação, detalhe, áudio, favorito e navegação;
- componentes das listas, do detalhe e da tela `/words/[word]`.

Não há teste de ponta a ponta.

`npm run lint` chama `expo lint`. O repositório não inclui configuração nem dependência do ESLint. O comando do Expo pode tentar instalá-las na primeira execução. Não há script de formatação. `prettier-plugin-tailwindcss` está nas devDependencies, sem configuração de Prettier no projeto.

## Decisões técnicas e trade-offs

A sessão do cliente ficou no Zustand porque é um estado pequeno, compartilhado e independente da resposta de cada endpoint. O resultado remoto ficou no TanStack Query para obter cache, paginação, cancelamento e invalidação sem copiar essa lógica para cada tela.

O Supabase concentra autenticação e persistência. O acesso foi feito pela REST com Axios para manter o contrato visível nos services e para controlar exatamente o que é persistido. O SDK instalado não participa desse fluxo. O refresh token retornado pelo Auth é descartado: o escopo pedido é identificar o usuário e amarrar histórico e favoritos a ele durante a validade do access token.

Services e hooks estão separados para que a chamada HTTP possa ser testada sem montar a tela, e para que a tela não conheça URL, header ou parâmetro do PostgREST.

O cache privado leva o `userId` na chave e é removido no logout. O cache da Dictionary API e da lista geral é reaproveitado porque não contém dado pessoal.

TypeScript com `strict` fixa o formato da sessão, das páginas e da resposta da Dictionary API. Campos opcionais da API só chegam à interface quando existem.

A navegação entre palavras usa as páginas já carregadas. Buscar a próxima página somente para habilitar Próximo aumentaria tráfego e mudaria a lista sem uma ação explícita de rolagem. A limitação foi mantida.

A lista depende de dados preparados no Supabase. Embarcar `words_dictionary.json` no aplicativo aumentaria o bundle e afastaria a lista do mesmo banco que guarda histórico e favoritos. A importação ficou fora do repositório, e por isso o ambiente não sobe completo apenas com `npm ci`.

## Limitações conhecidas

- Não há renovação de access token. A duração da sessão é a devolvida pelo Supabase. Depois dela, o usuário precisa entrar de novo, mesmo que a rede volte.
- O interceptor de HTTP 401 está em `getAuthenticatedApi()`, que não é o cliente usado pelas telas. Uma resposta 401 do cliente compartilhado não encerra a sessão por si só.
- A proteção de rotas no cliente não substitui RLS.
- Se o SecureStore recusar a gravação, o login não é concluído e a sessão não fica autenticada.
- Voltar e Próximo só conhecem palavras já carregadas na lista de origem.
- O áudio depende da URL e do servidor indicados pela Free Dictionary API. Não há outro provedor. Se o arquivo não carregar, ou se passarem 10 segundos sem carregar, o player oferece nova tentativa da mesma URL.
- A Home depende da tabela `words` previamente carregada. Não há seed.
- Não há migrations nem policies versionadas.
- Não há injeção de dependência.
- Não há testes E2E.
- Sinônimos, antônimos e origem não são exibidos.
- O `.gitignore` não impede o commit de `.env`, e esse arquivo está versionado hoje.
- `img/wireframe.png` está ausente na árvore de trabalho atual. A interface foi conferida contra a imagem ainda registrada no Git.

## Créditos

> This is a challenge by [Coodesh](https://coodesh.com/).

- [Coodesh](https://coodesh.com/)
- [Free Dictionary API](https://dictionaryapi.dev/)
- [dwyl/english-words](https://github.com/dwyl/english-words/blob/master/words_dictionary.json), origem prevista para a lista de palavras
