# Supabase LangChain

Integration package for using LangChain with Supabase to generate, store and synchronize embeddings with file content in Supabase Storage.

## Features

- **Embedding Service**: Generate and synchronize embeddings for text files in Supabase Storage using LangChain.

## Installation

Install the package, e.g. using bun:

```bash
bun install @freehour/supabase-core @freehour/supabase-langchain
```

### Migrations and Schemas

The package includes SQL files for setting up the necessary database schemas and extensions.
These files are copied post-installation to the `supabase/` directory of your project.
If you get a warning that the post-install script is blocked, you need to run the follwing command to trust the dependency:

```bash
bun pm trust @freehour/supabase-core @freehour/supabase-langchain
```

### Configuration

If you generate migrations from schemas, make sure to include the `supabase-core`, `supabase-langchain` schema in your `schema_paths` in `supabase/config.toml`.

```toml
schema_paths = [
    "./schemas/supabase-core/*.sql",
    "./schemas/supabase-langchain/*.sql",
    /* your app schema paths */
]
```

## Contributing

### Building

If you changed the database schema run the build script:

```bash
./scripts/build.sh
```

otherwise, you can just build the package:

```bash
bun run build
```

### Publishing

To publish a new version of the package, update the version in `package.json` and run:

```bash
bunx npm login
bun publish --access public
```



