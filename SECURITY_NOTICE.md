# Security notice

GreenTrace does not store private keys, wallet seed phrases, database passwords, JWT secrets, or provider credentials in source control.

The previous repository history contained environment files and a hard-coded map token. Any credential that has ever been committed must be treated as compromised and rotated or revoked by its owner. Removing a value from the current tree does not remove it from Git history.

Use `.env.example` and `server/.env.example` as templates. Keep real values only in ignored local environment files or a managed secret store. Verifier and operator blockchain transactions are signed by the user's compatible wallet; the server never asks for or stores a private key.

Public blockchain records contain only hashes, public signer addresses, state references, and timestamps. Exact coordinates, phone numbers, identity documents, commercial documents, raw photographs, and detailed reports must not be written to a public chain or public object store.

