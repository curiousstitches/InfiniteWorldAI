FROM gitpod/workspace-node-lts:latest

USER gitpod

# Pin Node 22 (LTS workspace usually has it but let's be explicit)
RUN bash -c 'source $HOME/.nvm/nvm.sh && nvm install 22 && nvm use 22 && nvm alias default 22'
