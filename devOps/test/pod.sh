#! /bin/bash
tar czvf f.tar.gz * 
scp f.tar.gz root@172.100.1.39:/data/www/fe-service/api-service/test/.
ssh root@172.100.1.39 "cd /data/www/fe-service/api-service/test/; tar zxvf f.tar.gz ;docker run -v /data/www/fe-service/api-service/test:/data --rm node:yarn "
ssh root@172.100.2.204 "kubectl rollout restart deployment api-service-test-deployment" 
