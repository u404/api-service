#! /bin/bash
version=$1

appName=api-service-prod
hubIp="172.20.2.49:8082"
logserver="172.20.2.49:9200"
port=7001
logPath=/logs/node-api
config=aws-config

cat <<EOF >Dockerfile
FROM node:latest
ENV LANG=C.UTF-8 NODE_ENV=prod
WORKDIR /data/api-service/
ADD ./ /data/api-service/.
RUN npm install pm2 -g && yarn
ENTRYPOINT  ["npm", "run", "deploy"]
EOF

cat <<EOF >yml
namespace: default
appName: $appName
image: $hubIp/$appName:$version
port: $port
log: $logPath
logserver: $logserver
config: $config
EOF

cat <<EOF >x.sh
docker rmi  $hubIp/$appName:$version
docker rmi  $appName:$version
docker build .  -t $appName:$version
docker tag $appName:$version $hubIp/$appName:$version
docker push $hubIp/$appName:$version
EOF

/root/miniconda3/envs/j2cli/bin/j2cli pod.yaml.j2 < yml >$appName.yml
#ssh root@mvp.mu51c.live "mkdir -p /data/www/config/k8s/$appName/"
#scp $appName.yml root@mvp.mu51c.live:/data/www/config/k8s/$appName/.

scp $appName.yml root@172.100.1.39:/data/www/config/k8s/$appName/.
tar czvf x.tar.gz *
ssh root@172.20.2.49 "rm -rf /data/sys_work/$appName/;mkdir -p  /data/sys_work/$appName/"
scp x.tar.gz root@172.20.2.49:/data/sys_work/$appName
ssh root@172.20.2.49 "cd /data/sys_work/$appName; tar zxvf x.tar.gz; source /etc/profile; bash x.sh"
ssh root@172.20.2.243 "kubectl  apply -f http://aws-config.lyrra.io/k8s/$appName/$appName.yml"

