pipeline {
    agent any

    environment {
        REGISTRY = '192.168.0.5:6901'
        IMAGE_NAME = 'msa4/team3/client'
        MANIFEST_REPO = 'https://github.com/msa4-lms-v2/msa4-lms-v2-k8s-manifests.git'
        MANIFEST_PATH = 'client'
        VITE_API_BASE_URL = 'https://mirae-sv.meerkat.p-e.kr'
    }

    stages {
        stage('Build & Push Image') {
            steps {
                script {
                    env.IMAGE_TAG = env.GIT_COMMIT.take(8)
                }
                withCredentials([string(credentialsId: 'toss-client-key', variable: 'VITE_TOSS_CLIENT_KEY')]) {
                    sh "docker build --build-arg VITE_TOSS_CLIENT_KEY=\${VITE_TOSS_CLIENT_KEY} --build-arg VITE_API_BASE_URL=${VITE_API_BASE_URL} -t ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ."
                }
                sh "docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        stage('Update Manifest') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'msa4-team3', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh """
                        git clone https://\${GIT_USER}:\${GIT_TOKEN}@${MANIFEST_REPO.replace('https://', '')} k8s-manifests
                        cd k8s-manifests/${MANIFEST_PATH}
                        sed -i "s|image: ${REGISTRY}/${IMAGE_NAME}:.*|image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}|" deployment.yaml
                        git config user.email msa4-team3@ci
                        git config user.name msa4-team3-ci
                        git commit -am "Deploy ${IMAGE_NAME}:${IMAGE_TAG}"
                        git push
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'rm -rf k8s-manifests'
            cleanWs()
        }
    }
}
