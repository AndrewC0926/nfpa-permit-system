# Vetria System Launch Checklist

## 1. Pre-Deployment
- [ ] All code committed and pushed to GitHub
- [ ] .env.example files present in frontend and backend
- [ ] .gitignore and .dockerignore exclude secrets and build artifacts
- [ ] All scripts in /scripts are executable and documented
- [ ] Chaincode and Fabric artifacts in /chaincode or /fabric-network

## 2. Frontend (Vercel)
- [ ] Vercel project linked to GitHub repo
- [ ] VITE_API_BASE_URL set to https://api.vetria.ai/api
- [ ] Domain vetria.ai connected in Vercel
- [ ] vercel.json present for API rewrites
- [ ] Build and deploy successful

## 3. Backend (Render/Fly.io)
- [ ] .env set with DB, CORS, AI, Fabric config
- [ ] Dockerfile present and working
- [ ] CORS enabled for https://vetria.ai
- [ ] Logging enabled
- [ ] API live at https://api.vetria.ai

## 4. Fabric/Chaincode
- [ ] Chaincode installed and committed
- [ ] registerEnroll.sh, channel-create.sh tested
- [ ] All orgs and users enrolled

## 5. Final Test
- [ ] Login as admin@vetria.ai
- [ ] Upload permit, trigger AI
- [ ] Blockchain hash in audit log
- [ ] Chatbot responds
- [ ] No console or network errors

## 6. Go Live!
- [ ] Announce and share demo link 