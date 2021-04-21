import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import Head from 'next/head';

import Link from 'next/link';
import { FaUser, FaCalendar } from 'react-icons/fa';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useState } from 'react';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { getPrismicClient } from '../services/prismic';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

function FormatPosts(posts: PostPagination): Post[] {
  const newPostsFormatted = posts.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        "dd MMM' 'yyyy",
        {
          locale: ptBR,
        }
      ),

      data: {
        title: post.data.title as string,
        subtitle: post.data.subtitle as string,
        author: post.data.author as string,
      },
    };
  });

  return newPostsFormatted;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const { results, next_page } = postsPagination;

  const resultsFormated = results.map(result => ({
    ...result,
    first_publication_date: format(
      new Date(result.first_publication_date),
      "dd MMM' 'yyyy",
      {
        locale: ptBR,
      }
    ),
  }));

  const [posts, setPosts] = useState<Post[]>(resultsFormated);
  const [nextPage, setNextPage] = useState(next_page);

  async function loadMorePostsButton(): Promise<void> {
    const nextPosts = await fetch(next_page);

    const nextPostsJSON = await nextPosts.json();

    const newPostsFormatted = FormatPosts(nextPostsJSON);

    setPosts([...posts, ...newPostsFormatted]);
    setNextPage(nextPostsJSON.nextPage);
  }
  return (
    <>
      <Head>
        <title>Home | SpaceTraveling</title>
      </Head>

      <header className={commonStyles.header}>
        <Link href="/">
          <a>
            <img src="/logo.svg" alt="logo" />
          </a>
        </Link>
      </header>

      <main className={styles.container}>
        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/posts/${post.uid}`}>
              <a key={post.uid}>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div className={styles.tagContainer}>
                  <FaCalendar />
                  <time>{post.first_publication_date}</time>

                  <FaUser className={styles.lastChild} />
                  <span>{post.data.author}</span>
                </div>
              </a>
            </Link>
          ))}
        </div>

        {nextPage && (
          <div className={styles.nextPageContainer}>
            <button
              className={styles.loadButton}
              type="button"
              onClick={() => loadMorePostsButton()}
            >
              Carregar mais posts
            </button>
          </div>
        )}
      </main>
    </>
  );
}
export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['post.title', 'post.content'],
      pageSize: 1,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,

      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination = {
    results: posts,
    next_page: postsResponse.next_page,
  };

  console.log(postsPagination);

  return {
    props: {
      postsPagination,
    },
    revalidate: 60 * 30,
  };
};
