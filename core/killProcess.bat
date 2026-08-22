netstat -ano | findstr 8078
taskkill /f /pid 2756

The test admin password I set for browser verification during this session is
AdminPass123! (email admin@example.com), and the viewer test account is viewer@example.com /
ViewerPass123! (with mustResetPassword forced true, to exercise that flow).