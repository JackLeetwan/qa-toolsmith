# Konfiguracja Node.js 22.14.x

Ten projekt wymaga Node.js w wersji **22.14.x** (zdefiniowane w `package.json` i `.nvmrc`).

## Szybka konfiguracja z nvm

Jeśli masz zainstalowany **nvm** (Node Version Manager):

```bash
# Przejdź do katalogu projektu
cd /path/to/qa-toolsmith

# Zainstaluj i użyj wersji z .nvmrc
nvm install
nvm use

# Ustaw jako domyślną wersję (opcjonalnie)
nvm alias default 22.14.0

# Sprawdź wersję
node --version  # powinno pokazać v22.14.0
```

## Automatyczne przełączanie wersji

Aby automatycznie używać poprawnej wersji Node.js po wejściu do katalogu projektu, dodaj do swojego `~/.bashrc` lub `~/.zshrc`:

```bash
# Automatyczne ładowanie nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Automatyczne użycie wersji z .nvmrc (opcjonalnie)
autoload -U add-zsh-hook  # dla zsh
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

Dla bash dodaj podobny kod do `~/.bashrc`.

## Instalacja nvm (jeśli nie masz)

Jeśli nie masz nvm, zainstaluj go:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Następnie zrestartuj terminal lub uruchom:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

## Weryfikacja

Po skonfigurowaniu sprawdź:

```bash
node --version  # powinno pokazać v22.14.0
npm --version   # powinno pokazać wersję npm (np. 10.9.2)
```

## Troubleshooting

### Problem: `nvm: command not found`

**Rozwiązanie:**
- Dodaj konfigurację nvm do `~/.bashrc` lub `~/.zshrc` (patrz wyżej)
- Zrestartuj terminal lub uruchom `source ~/.bashrc` / `source ~/.zshrc`

### Problem: Node.js wersja się nie zmienia

**Rozwiązanie:**
```bash
# Wymuś użycie wersji z .nvmrc
nvm use 22.14.0

# Sprawdź aktualną wersję
node --version
```

### Problem: E2E testy nie działają

**Rozwiązanie:**
- Upewnij się, że używasz Node.js >= 22.14.0
- Astro wymaga Node.js >= 18.20.8, ale projekt używa 22.14.x dla lepszej kompatybilności

## GitHub Actions

W CI/CD używamy `.nvmrc` do automatycznego ustawienia wersji Node.js. Wszystkie workflow GitHub Actions używają:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version-file: ".nvmrc"
```

## Więcej informacji

- [nvm dokumentacja](https://github.com/nvm-sh/nvm)
- [Node.js releases](https://nodejs.org/en/about/releases/)
