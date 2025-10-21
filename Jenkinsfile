pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  triggers {
    // Polling is fine for local Jenkins
    pollSCM('H/2 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          // Find the remote branch (like origin/dev or origin/main) that contains HEAD
          env.REMOTE_BRANCH = bat(
            script: 'git branch -r --contains HEAD | sed -n "s#.*origin/##p" | head -n1',
            returnStdout: true
          ).trim()
          echo "REMOTE_BRANCH=${env.REMOTE_BRANCH}"
        }
      }
    }

    stage('Build & Test') {
      steps {
        dir('app') {
          bat 'npm ci || npm install'
          bat 'npm test'
        }
      }
    }

    stage('Deploy to TEST') {
      when { expression { env.REMOTE_BRANCH == 'dev' } }
      steps {
        bat 'chmod +x scripts/deploy.bat'
        bat './scripts/deploy.bat test'
      }
    }

    stage('Smoke Test (TEST)') {
  when { expression { env.REMOTE_BRANCH == 'dev' } }
  steps {
    // Existing health check (keep it)
    bat '''
      set -e
      curl -fsS http://localhost:3001/health | jq -e ".status==\\"ok\\"" > /dev/null
    '''

    // NEW: capture first 20 lines of /metrics and save as artifact
    bat '''
      set -e
      curl -fsS http://localhost:3001/metrics | head -n 20 > metrics_head_test.txt
      echo "[INFO] Wrote metrics_head_test.txt"
    '''

    // Archive the artifact so it shows on the build page
    archiveArtifacts artifacts: 'metrics_head_test.txt', onlyIfSuccessful: true
  }
}


    stage('Approve PROD Deploy') {
      when { expression { env.REMOTE_BRANCH == 'main' } }
      steps {
        input message: 'Deploy to PROD?', ok: 'Ship it'
      }
    }

    stage('Deploy to PROD') {
      when { expression { env.REMOTE_BRANCH == 'main' } }
      steps {
        bat 'chmod +x scripts/deploy.bat'
        bat './scripts/deploy.bat prod'
      }
    }

    stage('Smoke Test (PROD)') {
  when { expression { env.REMOTE_BRANCH == 'main' } }
  steps {
    
    bat '''
      set -e
      curl -fsS http://localhost:3002/health | jq -e ".status==\\"ok\\"" > /dev/null
    '''

    
    bat '''
      set -e
      curl -fsS http://localhost:3002/metrics | head -n 20 > metrics_head_prod.txt
      echo "[INFO] Wrote metrics_head_prod.txt"
    '''

    
    archiveArtifacts artifacts: 'metrics_head_prod.txt', onlyIfSuccessful: true
  }
}

  }

  post {
    always {
      echo "Build finished."
    }
  }
}
